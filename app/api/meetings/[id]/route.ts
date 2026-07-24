import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Meeting } from '@/lib/mongodb/models/Meeting'

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

    const meeting = await Meeting.findById(id)
      .populate('organizer', 'fullName email')
      .populate('participants.userId', 'fullName email')
      .lean()

    if (!meeting) {
      return NextResponse.json(
        { message: 'Meeting not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, meeting })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch meeting' },
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

    const meeting = await Meeting.findById(id)
    if (!meeting) {
      return NextResponse.json(
        { message: 'Meeting not found' },
        { status: 404 }
      )
    }

    if (body.title) meeting.title = body.title
    if (body.description !== undefined) meeting.description = body.description
    if (body.notes !== undefined) meeting.notes = body.notes
    if (body.recordingUrl) meeting.recordingUrl = body.recordingUrl
    if (body.actionItems) meeting.actionItems = body.actionItems
    if (body.scheduledAt) meeting.scheduledAt = new Date(body.scheduledAt)

    if (body.action === 'start') {
      meeting.status = 'in_progress'
      meeting.startedAt = new Date()
    }

    if (body.action === 'end') {
      meeting.status = 'completed'
      meeting.endedAt = new Date()
      if (meeting.startedAt) {
        meeting.duration = Math.round(
          (meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000
        )
      }
    }

    if (body.action === 'cancel') {
      meeting.status = 'cancelled'
    }

    if (body.action === 'join') {
      const existing = meeting.participants.find(
        (p: any) => p.userId === auth.user.id
      )
      if (existing) {
        existing.joinedAt = new Date()
        existing.leftAt = undefined
      } else {
        meeting.participants.push({
          userId: auth.user.id,
          joinedAt: new Date(),
          role: 'participant',
        })
      }
    }

    if (body.action === 'leave') {
      const participant = meeting.participants.find(
        (p: any) => p.userId === auth.user.id
      )
      if (participant) {
        participant.leftAt = new Date()
      }
    }

    await meeting.save()

    const populated = await Meeting.findById(id)
      .populate('organizer', 'fullName email')
      .populate('participants.userId', 'fullName email')

    return NextResponse.json({ success: true, meeting: populated })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update meeting' },
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
    await Meeting.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Meeting deleted' })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete meeting' },
      { status: 500 }
    )
  }
}
