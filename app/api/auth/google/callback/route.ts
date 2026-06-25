import { type NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import connectToMongoDB from '@/lib/mongodb/connection'
import { User, Workspace, WorkspaceMember, Role } from '@/lib/mongodb/models'
import { generateToken } from '@/lib/mongodb/auth'
import { seedWorkspaceDefaults } from '@/lib/mongodb/seedDefaults'

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=missing_code', request.url)
      )
    }

    // Parse state
    let mode = 'login'
    if (stateParam) {
      try {
        const state = JSON.parse(
          Buffer.from(stateParam, 'base64url').toString()
        )
        mode = state.mode || 'login'
      } catch {
        // ignore parse errors
      }
    }

    // Exchange code for tokens
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: googleUser } = await oauth2.userinfo.get()

    if (!googleUser.email) {
      return NextResponse.redirect(
        new URL('/login?error=no_email', request.url)
      )
    }

    await connectToMongoDB()

    // Check if user exists with this Google ID
    let user = await User.findOne({
      oauthProvider: 'google',
      oauthId: googleUser.id,
    })

    // If not found by OAuth ID, check by email
    if (!user) {
      user = await User.findOne({ email: googleUser.email })
    }

    let workspace = null
    const redirectPath = '/dashboard'

    if (user) {
      // Existing user - link Google if not already linked
      if (!user.oauthProvider) {
        user.oauthProvider = 'google'
        user.oauthId = googleUser.id
      }

      // Update profile info from Google
      if (!user.fullName && googleUser.name) {
        user.fullName = googleUser.name
      }
      if (!user.avatarUrl && googleUser.picture) {
        user.avatarUrl = googleUser.picture
      }

      user.lastSignInAt = new Date()
      user.emailConfirmed = true
      user.emailConfirmedAt = user.emailConfirmedAt || new Date()
      await user.save()

      // Get workspace
      const membership = await WorkspaceMember.findOne({
        userId: user._id,
        status: 'active',
      })
        .populate('workspaceId')
        .sort({ createdAt: 1 })

      if (membership?.workspaceId) {
        workspace = membership.workspaceId
      }
    } else {
      // New user - create account
      user = new User({
        email: googleUser.email,
        password: `oauth_google_${googleUser.id}_${Date.now()}`, // placeholder, not used for OAuth login
        fullName: googleUser.name || googleUser.email.split('@')[0],
        avatarUrl: googleUser.picture || undefined,
        oauthProvider: 'google',
        oauthId: googleUser.id,
        emailConfirmed: true,
        emailConfirmedAt: new Date(),
        lastSignInAt: new Date(),
      })
      await user.save()

      // Create default workspace
      const workspaceName = `${googleUser.name || googleUser.email.split('@')[0]}'s Workspace`
      const slug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')

      workspace = new Workspace({
        name: workspaceName,
        slug,
        planId: 'free',
        createdBy: user._id,
      })
      await workspace.save()

      // Create owner role
      const ownerRole = new Role({
        workspaceId: workspace._id,
        name: 'Owner',
        description: 'Full access to workspace',
        permissions: ['*:*'],
        isDefault: false,
      })
      await ownerRole.save()

      // Add as member
      const member = new WorkspaceMember({
        workspaceId: workspace._id,
        userId: user._id,
        roleId: ownerRole._id,
        status: 'active',
        joinedAt: new Date(),
      })
      await member.save()

      // Seed defaults
      await seedWorkspaceDefaults(workspace._id, user._id)

      // Update user with workspace
      user.lastActiveWorkspaceId = workspace._id
      user.currentWorkspace = workspace._id
      await user.save()
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Build response - redirect to dashboard with auth cookie
    const response = NextResponse.redirect(new URL(redirectPath, request.url))

    // Set auth cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Set user data in a temporary cookie for the client to read
    const userData = JSON.stringify({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
      workspace: workspace
        ? {
            id: workspace._id,
            name: workspace.name,
            planId: workspace.planId,
          }
        : null,
    })

    response.cookies.set('oauth_user_data', userData, {
      httpOnly: false, // readable by client JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // 1 minute - just for the redirect
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', request.url)
    )
  }
}
