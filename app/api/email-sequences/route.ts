import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import {
  EmailSequence,
  SequenceEnrollment,
} from '@/lib/mongodb/models/EmailSequence'

const createSequenceSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z
    .array(
      z.object({
        order: z.number().min(0),
        subject: z.string().min(1).max(200),
        body: z.string().min(1),
        delayDays: z.number().min(0).default(1),
        delayHours: z.number().min(0).max(23).default(0),
      })
    )
    .min(1),
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

    const sequences = await EmailSequence.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, sequences })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch sequences' },
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
    const validation = createSequenceSchema.safeParse(body)

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
    if (permError) return permError

    const sequence = await EmailSequence.create({
      workspaceId,
      name,
      description,
      steps: steps.sort((a, b) => a.order - b.order),
      createdBy: auth.user.id,
    })

    return NextResponse.json({ success: true, sequence }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create sequence' },
      { status: 500 }
    )
  }
}
