import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { User } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { z } from 'zod'

// Validation schema for user preferences
const preferencesSchema = z.object({
  theme: z
    .object({
      mode: z.enum(['light', 'dark', 'auto']).optional(),
      primaryColor: z.string().optional(),
      preset: z.string().optional(),
      customTheme: z
        .object({
          colors: z
            .object({
              primary: z.string().optional(),
              secondary: z.string().optional(),
              accent: z.string().optional(),
              background: z.string().optional(),
              surface: z.string().optional(),
              text: z.string().optional(),
              border: z.string().optional(),
              success: z.string().optional(),
              warning: z.string().optional(),
              error: z.string().optional(),
            })
            .optional(),
          typography: z
            .object({
              fontFamily: z.string().optional(),
              fontSize: z.enum(['small', 'medium', 'large']).optional(),
            })
            .optional(),
          spacing: z
            .object({
              density: z
                .enum(['compact', 'comfortable', 'spacious'])
                .optional(),
            })
            .optional(),
          borderRadius: z.enum(['none', 'small', 'medium', 'large']).optional(),
          animations: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      leadUpdates: z.boolean().optional(),
      teamActivity: z.boolean().optional(),
      weeklyReports: z.boolean().optional(),
    })
    .optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
})

// GET /api/users/preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await User.findById(auth.user.id)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      preferences: user.preferences || {},
    })
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = preferencesSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: 'Validation failed',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const preferences = validationResult.data

    // Update user preferences
    const user = await User.findByIdAndUpdate(
      auth.user.id,
      {
        $set: {
          preferences: {
            ...preferences,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/preferences - Partially update user preferences
export async function PATCH(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Get current user preferences
    const user = await User.findById(auth.user.id)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Merge with existing preferences
    const currentPreferences = user.preferences || {}
    const updatedPreferences = {
      ...currentPreferences,
      ...body,
      updatedAt: new Date(),
    }

    // Validate merged preferences
    const validationResult = preferencesSchema.safeParse(updatedPreferences)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: 'Validation failed',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    // Update user preferences
    const updatedUser = await User.findByIdAndUpdate(
      auth.user.id,
      { $set: { preferences: updatedPreferences } },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences,
    })
  } catch (error) {
    console.error('Patch preferences error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
