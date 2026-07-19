export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/mongodb/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, workspaceName } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        {
          message: 'Email, password, and name are required',
        },
        { status: 400 }
      )
    }

    // Sign up user using MongoDB
    const result = await signUp({
      email,
      password,
      fullName: name,
      workspaceName,
    })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 400 })
    }

    const response = NextResponse.json({
      user: {
        ...result.user?.toJSON(),
        role: 'Owner',
        roleId: '',
        permissions: ['*:*'],
      },
      workspace: result.workspace,
      success: true,
    })

    // Set secure HTTP-only cookie with JWT token
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
