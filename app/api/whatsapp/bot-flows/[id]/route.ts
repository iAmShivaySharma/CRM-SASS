import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WhatsAppBotFlow } from '@/lib/mongodb/models/WhatsAppBotFlow'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const botFlow = await WhatsAppBotFlow.findById(id).lean()
    if (!botFlow) {
      return NextResponse.json(
        { message: 'Bot flow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, botFlow })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch bot flow' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const botFlow = await WhatsAppBotFlow.findById(id)
    if (!botFlow) {
      return NextResponse.json(
        { message: 'Bot flow not found' },
        { status: 404 }
      )
    }

    if (body.name !== undefined) {
      botFlow.name = body.name
    }
    if (body.description !== undefined) {
      botFlow.description = body.description
    }
    if (body.steps !== undefined) {
      botFlow.steps = body.steps
    }
    if (body.isActive !== undefined) {
      botFlow.isActive = body.isActive
    }
    if (body.triggerKeywords !== undefined) {
      botFlow.triggerKeywords = body.triggerKeywords
    }

    await botFlow.save()

    return NextResponse.json({ success: true, botFlow })
  } catch {
    return NextResponse.json(
      { message: 'Failed to update bot flow' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    await WhatsAppBotFlow.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Bot flow deleted' })
  } catch {
    return NextResponse.json(
      { message: 'Failed to delete bot flow' },
      { status: 500 }
    )
  }
}
