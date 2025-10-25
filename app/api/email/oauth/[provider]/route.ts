import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { GoogleOAuthProvider, MicrosoftOAuthProvider } from '@/lib/auth/oauth-providers'
import { log } from '@/lib/logging/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params

    // Verify user is authenticated
    const auth = await requireAuth(request)
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    // Generate state parameter for security
    const state = Buffer.from(
      JSON.stringify({
        userId: auth.user.id,
        workspaceId,
        timestamp: Date.now()
      })
    ).toString('base64')

    let authUrl: string

    switch (provider) {
      case 'google':
        const googleProvider = GoogleOAuthProvider.create()
        authUrl = googleProvider.getAuthUrl(state)
        break

      case 'microsoft':
        const microsoftProvider = MicrosoftOAuthProvider.create()
        authUrl = microsoftProvider.getAuthUrl(state)
        break

      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    log.info('OAuth flow initiated', {
      provider,
      userId: auth.user.id,
      workspaceId
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    log.error('OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}