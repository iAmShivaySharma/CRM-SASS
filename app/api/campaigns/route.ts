import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import { Campaign } from '@/lib/mongodb/models/Campaign'

const stepSchema = z.object({
  order: z.number().min(0),
  channel: z.enum(['email', 'whatsapp', 'sms', 'ai_reply']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  delayDays: z.number().min(0).default(1),
  delayHours: z.number().min(0).max(23).default(0),
  aiTone: z.enum(['professional', 'friendly', 'casual']).optional(),
  aiContext: z.string().max(2000).optional(),
  replyViaChannel: z.enum(['email', 'whatsapp', 'sms']).optional(),
})

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(stepSchema).min(1),
})

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

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const campaigns = await Campaign.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, campaigns })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const validation = createSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    const { workspaceId, name, description, steps } = validation.data

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.edit'
    )
    if (permError) {
      return permError
    }

    const campaign = await Campaign.create({
      workspaceId,
      name,
      description,
      steps: steps.sort((a, b) => a.order - b.order),
      createdBy: auth.user.id,
    })

    return NextResponse.json({ success: true, campaign }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
