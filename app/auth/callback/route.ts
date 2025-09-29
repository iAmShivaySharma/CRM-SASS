import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    if (error) {
      console.error('Auth callback error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      )
    }

    // Since we're using JWT-based auth now, redirect to login
    // OAuth callbacks would need to be handled differently with MongoDB
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=Authentication failed', request.url)
    )
  }
}
