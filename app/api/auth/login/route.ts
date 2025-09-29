import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/mongodb/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sign in user using MongoDB
    const result = await signIn({ email, password })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 401 })
    }

    // Create response with user data (no token in response body)
    const response = NextResponse.json({
      user: result.user,
      workspace: result.workspace,
      success: true,
    })

    // Set secure HTTP-only cookie with JWT token
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
