export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { LinkedInOAuthProvider } from '@/lib/auth/social-oauth-providers'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { SocialOAuthConnection } from '@/lib/mongodb/models/SocialOAuthConnection'
import { log } from '@/lib/logging/logger'

const STATE_EXPIRY_MS = 10 * 60 * 1000

function popupResponse(type: string, extra?: Record<string, string>) {
  const payload = JSON.stringify({ type, ...extra })
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(${payload}, '*');
      window.close();
    </script><p>${type === 'OAUTH_SUCCESS' ? 'Connected!' : 'Connection failed.'} This window will close automatically.</p></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    const error = searchParams.get('error')

    if (error || !code || !stateParam) {
      log.error('LinkedIn callback error', { error, hasCode: !!code })
      return popupResponse('OAUTH_ERROR')
    }

    let state: { userId: string; workspaceId: string; timestamp: number }
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf-8'))
    } catch {
      return popupResponse('OAUTH_ERROR')
    }

    if (
      !state.userId ||
      !state.workspaceId ||
      Date.now() - state.timestamp > STATE_EXPIRY_MS
    ) {
      return popupResponse('OAUTH_ERROR')
    }

    const provider = new LinkedInOAuthProvider()
    const tokens = await provider.exchangeCodeForTokens(code)
    const userInfo = await provider.getUserInfo(tokens.accessToken)

    await connectToMongoDB()

    const expiresAt = new Date(Date.now() + tokens.expiresIn)

    await SocialOAuthConnection.findOneAndUpdate(
      {
        workspaceId: state.workspaceId,
        provider: 'linkedin',
        providerAccountId: userInfo.id,
      },
      {
        userId: state.userId,
        displayName: userInfo.name,
        email: userInfo.email,
        profilePicture: userInfo.picture,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scope.split(' ').filter(Boolean),
        isActive: true,
        metadata: { linkedinId: userInfo.id },
      },
      { upsert: true, new: true }
    )

    log.info('LinkedIn account connected', {
      userId: state.userId,
      workspaceId: state.workspaceId,
      linkedinId: userInfo.id,
    })

    return popupResponse('OAUTH_SUCCESS', {
      provider: 'linkedin',
      name: userInfo.name,
    })
  } catch (error) {
    log.error('LinkedIn OAuth callback error:', error)
    return popupResponse('OAUTH_ERROR')
  }
}
