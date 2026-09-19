import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import { WhatsAppBotFlow } from '@/lib/mongodb/models/WhatsAppBotFlow'

const stepSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'send_message',
    'wait_for_reply',
    'keyword_match',
    'quick_reply',
    'list_message',
    'ai_reply',
    'assign_human',
    'delay',
    'condition',
  ]),
  data: z.record(z.unknown()).default({}),
  position: z.object({ x: z.number(), y: z.number() }),
  connections: z
    .array(
      z.object({
        targetStepId: z.string(),
        label: z.string().optional(),
      })
    )
    .default([]),
})

const createSchema = z.object({
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(stepSchema).default([]),
  triggerKeywords: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
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
    const accountId = searchParams.get('accountId')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.view'
    )
    if (permError) {
      return permError
    }

    const filter: Record<string, string> = { workspaceId }
    if (accountId) {
      filter.accountId = accountId
    }

    const botFlows = await WhatsAppBotFlow.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, botFlows })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch bot flows' },
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

    const { workspaceId } = validation.data

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.create'
    )
    if (permError) {
      return permError
    }

    const botFlow = await WhatsAppBotFlow.create({
      ...validation.data,
      createdBy: auth.user.id,
    })

    return NextResponse.json({ success: true, botFlow }, { status: 201 })
  } catch {
    return NextResponse.json(
      { message: 'Failed to create bot flow' },
      { status: 500 }
    )
  }
}
