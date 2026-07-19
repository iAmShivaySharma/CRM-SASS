export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import {
  GoogleOAuthProvider,
  MicrosoftOAuthProvider,
} from '@/lib/auth/oauth-providers'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import EmailAccount from '@/lib/mongodb/models/EmailAccount'
import { log } from '@/lib/logging/logger'

const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const errorRedirect = `${appUrl}/email?error=auth_failed&provider=${provider}`

  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')

    if (!code || !stateParam) {
      log.error('OAuth callback missing code or state', { provider })
      return NextResponse.redirect(errorRedirect)
    }

    let state: { userId: string; workspaceId: string; timestamp: number }
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf-8'))
    } catch {
      log.error('OAuth callback invalid state parameter', { provider })
      return NextResponse.redirect(errorRedirect)
    }

    if (!state.userId || !state.workspaceId || !state.timestamp) {
      log.error('OAuth callback state missing required fields', { provider })
      return NextResponse.redirect(errorRedirect)
    }

    if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      log.error('OAuth callback state expired', {
        provider,
        userId: state.userId,
        age: Date.now() - state.timestamp,
      })
      return NextResponse.redirect(
        `${appUrl}/email?error=state_expired&provider=${provider}`
      )
    }

    let tokens: {
      accessToken: string
      refreshToken: string
      expiresIn: number
      scope?: string
    }
    let userInfo: { email: string; name: string }

    switch (provider) {
      case 'google': {
        const googleProvider = GoogleOAuthProvider.create()
        tokens = await googleProvider.exchangeCodeForTokens(code)
        userInfo = await googleProvider.getUserInfo(tokens.accessToken)
        break
      }
      case 'microsoft': {
        const microsoftProvider = MicrosoftOAuthProvider.create()
        tokens = await microsoftProvider.exchangeCodeForTokens(code)
        userInfo = await microsoftProvider.getUserInfo(tokens.accessToken)
        break
      }
      default:
        log.error('OAuth callback unsupported provider', { provider })
        return NextResponse.redirect(errorRedirect)
    }

    if (!userInfo.email) {
      log.error('OAuth callback failed to get user email', {
        provider,
        userId: state.userId,
      })
      return NextResponse.redirect(errorRedirect)
    }

    const emailProvider = provider === 'google' ? 'gmail' : 'outlook'

    await connectToMongoDB()

    const existingAccount = await EmailAccount.findOne({
      emailAddress: userInfo.email,
      userId: state.userId,
      workspaceId: state.workspaceId,
    }).select('+oauthAccessToken +oauthRefreshToken')

    let savedAccountId: string

    if (existingAccount) {
      existingAccount.setOAuthTokens(
        tokens.accessToken,
        tokens.refreshToken,
        Math.floor(tokens.expiresIn / 1000) // Convert ms to seconds for setOAuthTokens
      )
      existingAccount.connectionStatus = 'connected'
      existingAccount.isActive = true
      await existingAccount.save()
      savedAccountId = existingAccount._id.toString()

      log.info('OAuth tokens refreshed for existing email account', {
        provider: emailProvider,
        emailAddress: userInfo.email,
        userId: state.userId,
        workspaceId: state.workspaceId,
      })
    } else {
      const accountCount = await EmailAccount.countDocuments({
        userId: state.userId,
        workspaceId: state.workspaceId,
        isActive: true,
      })

      const newAccount = new EmailAccount({
        userId: state.userId,
        workspaceId: state.workspaceId,
        provider: emailProvider,
        displayName: userInfo.name || userInfo.email,
        emailAddress: userInfo.email,
        connectionStatus: 'connected',
        isActive: true,
        isDefault: accountCount === 0,
        settings: {
          syncEnabled: true,
          syncInterval: 15,
          folders: {
            inbox: 'INBOX',
            sent:
              emailProvider === 'gmail' ? '[Gmail]/Sent Mail' : 'Sent Items',
            drafts: emailProvider === 'gmail' ? '[Gmail]/Drafts' : 'Drafts',
            trash:
              emailProvider === 'gmail' ? '[Gmail]/Trash' : 'Deleted Items',
          },
        },
        stats: {
          emailsSent: 0,
          emailsReceived: 0,
        },
      })

      newAccount.setOAuthTokens(
        tokens.accessToken,
        tokens.refreshToken,
        Math.floor(tokens.expiresIn / 1000) // Convert ms to seconds for setOAuthTokens
      )

      await newAccount.save()
      savedAccountId = newAccount._id.toString()

      log.info('New email account connected via OAuth', {
        provider: emailProvider,
        emailAddress: userInfo.email,
        userId: state.userId,
        workspaceId: state.workspaceId,
        isDefault: accountCount === 0,
      })
    }

    return new NextResponse(
      `<!DOCTYPE html><html><body><script>
        window.opener && window.opener.postMessage({ type: 'OAUTH_SUCCESS', accountId: '${savedAccountId}' }, '*');
        window.close();
      </script><p>Connected! This window will close automatically.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    log.error('OAuth callback error:', error)
    return new NextResponse(
      `<!DOCTYPE html><html><body><script>
        window.opener && window.opener.postMessage({ type: 'OAUTH_ERROR' }, '*');
        window.close();
      </script><p>Connection failed. This window will close automatically.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
