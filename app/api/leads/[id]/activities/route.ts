import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { mongoClient } from '@/lib/mongodb/client'
import { z } from 'zod'

const getActivitiesSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 50)),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const validation = getActivitiesSchema.safeParse({
      limit: searchParams.get('limit'),
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { limit } = validation.data
    const { id: leadId } = await params

    // Get lead activities
    const activities = await mongoClient.getLeadActivities(leadId, limit)

    return NextResponse.json({
      success: true,
      activities,
    })
  } catch (error) {
    console.error('=== LEAD ACTIVITIES API ERROR ===')
    console.error('Error details:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { id: leadId } = await params

    const activitySchema = z.object({
      activityType: z.enum([
        'created',
        'updated',
        'status_changed',
        'assigned',
        'note_added',
        'converted',
        'deleted',
      ]),
      description: z.string().min(1).max(500),
      changes: z
        .array(
          z.object({
            field: z.string(),
            oldValue: z.any().optional(),
            newValue: z.any().optional(),
          })
        )
        .optional(),
      metadata: z.record(z.any()).optional(),
    })

    const validation = activitySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid activity data',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const activityData = {
      ...validation.data,
      leadId,
      workspaceId,
      performedBy: auth.user.id,
    }

    const activity = await mongoClient.createLeadActivity(activityData)

    return NextResponse.json(
      {
        success: true,
        activity,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('=== CREATE LEAD ACTIVITY API ERROR ===')
    console.error('Error details:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
