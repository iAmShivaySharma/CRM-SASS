import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/mongodb/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, workspaceName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        {
          message: 'Email, password, and full name are required',
        },
        { status: 400 }
      )
    }

    // Sign up user using MongoDB
    const result = await signUp({ email, password, fullName, workspaceName })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 400 })
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
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
