export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import {
  LinkedInOAuthProvider,
  MetaOAuthProvider,
} from '@/lib/auth/social-oauth-providers'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { SocialAccount } from '@/lib/mongodb/models/SocialAccount'
import { log } from '@/lib/logging/logger'

const STATE_EXPIRY_MS = 10 * 60 * 1000
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function popupResponse(type: string, extra?: Record<string, string>) {
  const payload = JSON.stringify({ type, ...extra })
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>window.opener&&window.opener.postMessage(${payload},'*');window.close();</script><p>${type === 'SOCIAL_OAUTH_SUCCESS' ? 'Connected!' : 'Connection failed.'} This window will close automatically.</p></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

function parseState(stateParam: string) {
  const state = JSON.parse(
    Buffer.from(stateParam, 'base64').toString('utf-8')
  ) as {
    userId: string
    workspaceId: string
    platform: string
    timestamp: number
  }

  if (
    !state.userId ||
    !state.workspaceId ||
    !state.platform ||
    Date.now() - state.timestamp > STATE_EXPIRY_MS
  ) {
    throw new Error('Invalid or expired state')
  }

  return state
}

async function handleFacebookCallback(
  code: string,
  state: ReturnType<typeof parseState>
) {
  const redirectUri = `${appUrl}/api/social/oauth/facebook/callback`
  const provider = new MetaOAuthProvider(redirectUri)
  const tokens = await provider.exchangeCodeForTokens(code)

  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${tokens.accessToken}`
  )

  if (!pagesRes.ok) {
    throw new Error('Failed to fetch Facebook pages')
  }

  const pagesData = await pagesRes.json()
  const pages = pagesData.data || []

  await connectToMongoDB()

  for (const page of pages) {
    await SocialAccount.findOneAndUpdate(
      {
        workspaceId: state.workspaceId,
        platform: 'facebook',
        accountId: page.id,
      },
      {
        accountName: page.name,
        accessToken: page.access_token,
        isActive: true,
        createdBy: state.userId,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn),
        profileUrl: `https://facebook.com/${page.id}`,
      },
      { upsert: true, new: true }
    )
  }

  if (pages.length === 0) {
    const userInfo = await provider.getUserInfo(tokens.accessToken)
    await SocialAccount.findOneAndUpdate(
      {
        workspaceId: state.workspaceId,
        platform: 'facebook',
        accountId: userInfo.id,
      },
      {
        accountName: userInfo.name,
        accessToken: tokens.accessToken,
        isActive: true,
        createdBy: state.userId,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn),
      },
      { upsert: true, new: true }
    )
  }

  return pages.length || 1
}

async function handleInstagramCallback(
  code: string,
  state: ReturnType<typeof parseState>
) {
  const redirectUri = `${appUrl}/api/social/oauth/instagram/callback`
  const provider = new MetaOAuthProvider(redirectUri)
  const tokens = await provider.exchangeCodeForTokens(code)

  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${tokens.accessToken}`
  )

  if (!pagesRes.ok) {
    throw new Error('Failed to fetch pages for Instagram')
  }

  const pagesData = await pagesRes.json()
  const pages = pagesData.data || []

  await connectToMongoDB()
  let count = 0

  for (const page of pages) {
    if (page.instagram_business_account) {
      const igRes = await fetch(
        `https://graph.facebook.com/v18.0/${page.instagram_business_account.id}?fields=id,name,username,profile_picture_url&access_token=${page.access_token}`
      )

      if (igRes.ok) {
        const igData = await igRes.json()
        await SocialAccount.findOneAndUpdate(
          {
            workspaceId: state.workspaceId,
            platform: 'instagram',
            accountId: igData.id,
          },
          {
            accountName: igData.username || igData.name || page.name,
            accessToken: page.access_token,
            isActive: true,
            createdBy: state.userId,
            tokenExpiresAt: new Date(Date.now() + tokens.expiresIn),
            profileImage: igData.profile_picture_url,
            profileUrl: igData.username
              ? `https://instagram.com/${igData.username}`
              : undefined,
          },
          { upsert: true, new: true }
        )
        count++
      }
    }
  }

  return count
}

async function handleLinkedInCallback(
  code: string,
  state: ReturnType<typeof parseState>
) {
  const redirectUri = `${appUrl}/api/social/oauth/linkedin/callback`
  const provider = new LinkedInOAuthProvider(redirectUri)
  const tokens = await provider.exchangeCodeForTokens(code)
  const userInfo = await provider.getUserInfo(tokens.accessToken)

  await connectToMongoDB()

  await SocialAccount.findOneAndUpdate(
    {
      workspaceId: state.workspaceId,
      platform: 'linkedin',
      accountId: userInfo.id,
    },
    {
      accountName: userInfo.name,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isActive: true,
      createdBy: state.userId,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn),
      profileImage: userInfo.picture,
    },
    { upsert: true, new: true }
  )

  try {
    const orgsRes = await fetch(
      'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName)))',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    )

    if (orgsRes.ok) {
      const orgsData = await orgsRes.json()
      const elements = orgsData.elements || []

      for (const el of elements) {
        const orgUrn = el.organizationalTarget
        const orgName =
          el['organizationalTarget~']?.localizedName || 'LinkedIn Company Page'
        const orgId = orgUrn?.split(':').pop()

        if (orgId) {
          await SocialAccount.findOneAndUpdate(
            {
              workspaceId: state.workspaceId,
              platform: 'linkedin',
              accountId: orgId,
            },
            {
              accountName: orgName,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              isActive: true,
              createdBy: state.userId,
              tokenExpiresAt: new Date(Date.now() + tokens.expiresIn),
            },
            { upsert: true, new: true }
          )
        }
      }
    }
  } catch {
    log.warn(
      'Failed to fetch LinkedIn org pages, personal profile still connected'
    )
  }

  return userInfo.name
}

async function handleTwitterCallback(
  code: string,
  state: ReturnType<typeof parseState>,
  codeVerifier: string
) {
  const redirectUri = `${appUrl}/api/social/oauth/twitter/callback`

  const basicAuth = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString('base64')

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text()
    throw new Error(`Twitter token exchange failed: ${errBody}`)
  }

  const tokenData = await tokenRes.json()

  const userRes = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  )

  if (!userRes.ok) {
    throw new Error('Failed to fetch Twitter user info')
  }

  const userData = await userRes.json()
  const user = userData.data

  await connectToMongoDB()

  await SocialAccount.findOneAndUpdate(
    {
      workspaceId: state.workspaceId,
      platform: 'twitter',
      accountId: user.id,
    },
    {
      accountName: user.username || user.name,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      isActive: true,
      createdBy: state.userId,
      tokenExpiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      profileUrl: `https://x.com/${user.username}`,
      profileImage: user.profile_image_url,
    },
    { upsert: true, new: true }
  )

  return user.username || user.name
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params

  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    const error = searchParams.get('error')

    if (error || !code || !stateParam) {
      log.error('Social OAuth callback error', {
        platform,
        error,
        hasCode: !!code,
      })
      return popupResponse('SOCIAL_OAUTH_ERROR', { platform })
    }

    let state: ReturnType<typeof parseState>
    try {
      state = parseState(stateParam)
    } catch {
      return popupResponse('SOCIAL_OAUTH_ERROR', { platform })
    }

    if (state.platform !== platform) {
      return popupResponse('SOCIAL_OAUTH_ERROR', { platform })
    }

    let accountName = ''

    if (platform === 'facebook') {
      await handleFacebookCallback(code, state)
      accountName = 'Facebook Page'
    } else if (platform === 'instagram') {
      await handleInstagramCallback(code, state)
      accountName = 'Instagram Account'
    } else if (platform === 'linkedin') {
      accountName = await handleLinkedInCallback(code, state)
    } else if (platform === 'twitter') {
      const codeVerifier = request.cookies.get('twitter_code_verifier')?.value
      if (!codeVerifier) {
        return popupResponse('SOCIAL_OAUTH_ERROR', { platform })
      }
      accountName = await handleTwitterCallback(code, state, codeVerifier)
    } else {
      return popupResponse('SOCIAL_OAUTH_ERROR', { platform })
    }

    log.info('Social account connected via OAuth', {
      userId: state.userId,
      workspaceId: state.workspaceId,
      platform,
    })

    return popupResponse('SOCIAL_OAUTH_SUCCESS', {
      platform,
      name: accountName,
    })
  } catch (error) {
    log.error('Social OAuth callback error:', error)
    return popupResponse('SOCIAL_OAUTH_ERROR', { platform })
  }
}
