export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { LinkedInOAuthProvider } from '@/lib/auth/social-oauth-providers'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      )
    }

    const state = Buffer.from(
      JSON.stringify({
        userId: auth.user.id,
        workspaceId,
        timestamp: Date.now(),
      })
    ).toString('base64')

    const provider = new LinkedInOAuthProvider()
    const authUrl = provider.getAuthUrl(state)

    log.info('LinkedIn OAuth initiated', { userId: auth.user.id, workspaceId })
    return NextResponse.json({ authUrl })
  } catch (error) {
    log.error('LinkedIn OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate LinkedIn OAuth' },
      { status: 500 }
    )
  }
}
