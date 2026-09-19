export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  LinkedInOAuthProvider,
  MetaOAuthProvider,
} from '@/lib/auth/social-oauth-providers'
import { log } from '@/lib/logging/logger'
import crypto from 'crypto'

const VALID_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
] as const
type Platform = (typeof VALID_PLATFORMS)[number]

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function buildState(
  userId: string,
  workspaceId: string,
  platform: string,
  extra?: Record<string, string>
) {
  return Buffer.from(
    JSON.stringify({
      userId,
      workspaceId,
      platform,
      timestamp: Date.now(),
      ...extra,
    })
  ).toString('base64')
}

function getMetaAuthUrl(state: string, platform: 'facebook' | 'instagram') {
  const redirectUri = `${appUrl}/api/social/oauth/${platform}/callback`
  const provider = new MetaOAuthProvider(redirectUri)
  const scopes = [
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'business_management',
  ]
  return provider.getAuthUrl(state, scopes)
}

function getLinkedInAuthUrl(state: string) {
  const redirectUri = `${appUrl}/api/social/oauth/linkedin/callback`
  const provider = new LinkedInOAuthProvider(redirectUri)
  const scopes = ['openid', 'profile', 'email', 'w_member_social']
  return provider.getAuthUrl(state, scopes)
}

function getTwitterAuthUrl(state: string) {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  const redirectUri = `${appUrl}/api/social/oauth/twitter/callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return {
    authUrl: `https://twitter.com/i/oauth2/authorize?${params}`,
    codeVerifier,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const auth = await requireAuth(request)
    const { platform } = await params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      )
    }

    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    let authUrl: string

    if (platform === 'facebook' || platform === 'instagram') {
      const state = buildState(auth.user.id, workspaceId, platform)
      authUrl = getMetaAuthUrl(state, platform)
    } else if (platform === 'linkedin') {
      const state = buildState(auth.user.id, workspaceId, platform)
      authUrl = getLinkedInAuthUrl(state)
    } else {
      const twitterResult = getTwitterAuthUrl(
        buildState(auth.user.id, workspaceId, platform)
      )
      authUrl = twitterResult.authUrl

      const response = NextResponse.json({ authUrl })
      response.cookies.set(
        'twitter_code_verifier',
        twitterResult.codeVerifier,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600,
          path: '/api/social/oauth/twitter/callback',
        }
      )

      log.info('Social OAuth initiated', {
        userId: auth.user.id,
        workspaceId,
        platform,
      })
      return response
    }

    log.info('Social OAuth initiated', {
      userId: auth.user.id,
      workspaceId,
      platform,
    })
    return NextResponse.json({ authUrl })
  } catch (error) {
    log.error('Social OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}
