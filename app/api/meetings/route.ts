import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Meeting } from '@/lib/mongodb/models/Meeting'

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
    const status = searchParams.get('status')
    const chatRoomId = searchParams.get('chatRoomId')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const query: any = { workspaceId }
    if (status) query.status = status
    if (chatRoomId) query.chatRoomId = chatRoomId

    const meetings = await Meeting.find(query)
      .populate('organizer', 'fullName email')
      .populate('participants.userId', 'fullName email')
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ success: true, meetings })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch meetings' },
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
    const {
      workspaceId,
      chatRoomId,
      title,
      description,
      type,
      scheduledAt,
      participantIds,
      linkedLeadId,
      linkedContactId,
    } = body

    if (!workspaceId || !title) {
      return NextResponse.json(
        { message: 'workspaceId and title are required' },
        { status: 400 }
      )
    }

    const participants = [
      { userId: auth.user.id, role: 'organizer' as const },
      ...(participantIds || []).map((id: string) => ({
        userId: id,
        role: 'participant' as const,
      })),
    ]

    const meeting = await Meeting.create({
      workspaceId,
      chatRoomId,
      title,
      description,
      type: type || 'voice',
      status: scheduledAt ? 'scheduled' : 'in_progress',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      startedAt: scheduledAt ? undefined : new Date(),
      organizer: auth.user.id,
      participants,
      linkedLeadId,
      linkedContactId,
    })

    const populated = await Meeting.findById(meeting._id)
      .populate('organizer', 'fullName email')
      .populate('participants.userId', 'fullName email')

    return NextResponse.json(
      { success: true, meeting: populated },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create meeting' },
      { status: 500 }
    )
  }
}
