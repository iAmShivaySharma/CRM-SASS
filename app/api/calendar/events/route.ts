import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'

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

    const { Lead } = await import('@/lib/mongodb/client')
    const { Task } = await import('@/lib/mongodb/models')

    const [followUps, tasks] = await Promise.all([
      Lead.find({
        workspaceId,
        nextFollowUpAt: { $exists: true, $ne: null },
        convertedToContactId: { $exists: false },
      })
        .select('name nextFollowUpAt email company assignedTo')
        .populate('assignedTo', 'fullName')
        .lean(),
      Task.find({
        workspaceId,
        dueDate: { $exists: true, $ne: null },
        status: { $ne: 'completed' },
      })
        .select('title dueDate assigneeId priority status')
        .populate('assigneeId', 'fullName')
        .lean(),
    ])

    const events = [
      ...(followUps as any[]).map(lead => ({
        id: `lead-${lead._id}`,
        title: `Follow up: ${lead.name}`,
        start: lead.nextFollowUpAt,
        type: 'follow-up',
        entityType: 'lead',
        entityId: lead._id,
        assignedTo: lead.assignedTo?.fullName,
        metadata: { email: lead.email, company: lead.company },
      })),
      ...(tasks as any[]).map(task => ({
        id: `task-${task._id}`,
        title: task.title,
        start: task.dueDate,
        type: 'task',
        entityType: 'task',
        entityId: task._id,
        assignedTo: task.assigneeId?.fullName,
        priority: task.priority,
        status: task.status,
      })),
    ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    return NextResponse.json({ success: true, events })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch calendar events' },
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

    const { workspaceId, title, start, end, type, entityType, entityId } =
      await request.json()

    if (!workspaceId || !title || !start) {
      return NextResponse.json(
        { message: 'workspaceId, title, and start are required' },
        { status: 400 }
      )
    }

    if (entityType === 'lead' && entityId) {
      const { Lead } = await import('@/lib/mongodb/client')
      await Lead.findByIdAndUpdate(entityId, {
        nextFollowUpAt: new Date(start),
      })
    }

    if (entityType === 'task' && entityId) {
      const { Task } = await import('@/lib/mongodb/models')
      await Task.findByIdAndUpdate(entityId, {
        dueDate: new Date(start),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Event created',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create event' },
      { status: 500 }
    )
  }
}
