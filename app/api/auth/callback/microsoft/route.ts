import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailAccount } from '@/lib/mongodb/models'
import { MicrosoftOAuthProvider } from '@/lib/auth/oauth-providers'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      log.warn('Microsoft OAuth error:', { error })
      return NextResponse.redirect(
        new URL(`/email?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/email?error=missing_code', request.url)
      )
    }

    // Get user from auth
    const auth = await requireAuth(request)
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.redirect(
        new URL('/email?error=no_workspace', request.url)
      )
    }

    // Exchange code for tokens
    const microsoftProvider = MicrosoftOAuthProvider.create()
    const tokens = await microsoftProvider.exchangeCodeForTokens(code)

    // Get user profile from Microsoft
    const userInfo = await microsoftProvider.getUserInfo(tokens.accessToken)

    // Check if account already exists
    const existingAccount = await EmailAccount.findOne({
      emailAddress: userInfo.email,
      workspaceId,
      isActive: true
    })

    if (existingAccount) {
      // Update existing account with new tokens
      existingAccount.setOAuthTokens(
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn
      )
      await existingAccount.save()

      log.info('Microsoft email account tokens updated', {
        userId: auth.user.id,
        workspaceId,
        accountId: existingAccount._id,
        email: userInfo.email
      })

      return NextResponse.redirect(
        new URL(`/email?success=account_updated&accountId=${existingAccount._id}`, request.url)
      )
    }

    // Check if this is the first account (make it default)
    const accountCount = await EmailAccount.countDocuments({
      userId: auth.user.id,
      workspaceId,
      isActive: true
    })

    const isFirstAccount = accountCount === 0

    // Create new email account
    const account = new EmailAccount({
      userId: auth.user.id,
      workspaceId,
      provider: 'outlook',
      displayName: userInfo.displayName || userInfo.email,
      emailAddress: userInfo.email,
      isActive: true,
      isDefault: isFirstAccount,
      settings: {
        syncEnabled: true,
        syncInterval: 15,
        signature: '',
        folders: {
          inbox: 'Inbox',
          sent: 'SentItems',
          drafts: 'Drafts',
          trash: 'DeletedItems'
        }
      }
    })

    // Set OAuth tokens
    account.setOAuthTokens(
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn
    )

    await account.save()

    log.info('Microsoft email account created', {
      userId: auth.user.id,
      workspaceId,
      accountId: account._id,
      email: userInfo.email,
      isDefault: isFirstAccount
    })

    return NextResponse.redirect(
      new URL(`/email?success=account_added&accountId=${account._id}`, request.url)
    )
  } catch (error) {
    log.error('Microsoft OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/email?error=oauth_failed', request.url)
    )
  }
}