export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  )
}

// GET /api/auth/google - Redirect to Google OAuth consent screen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'login' // 'login' or 'register'

    const oauth2Client = getOAuth2Client()

    const state = Buffer.from(
      JSON.stringify({
        mode,
        timestamp: Date.now(),
      })
    ).toString('base64url')

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_AUTH_SCOPES,
      state,
      prompt: 'select_account',
    })

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initialize Google authentication' },
      { status: 500 }
    )
  }
}
