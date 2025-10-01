import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { ChatRoom, WorkspaceMember } from '@/lib/mongodb/models'
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
    const includeArchived = searchParams.get('includeArchived') === 'true'

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Verify user is member of workspace
    const member = await WorkspaceMember.findOne({
      userId: auth.user._id,
      workspaceId,
      status: 'active',
    })

    if (!member) {
      return NextResponse.json(
        { message: 'Not authorized for this workspace' },
        { status: 403 }
      )
    }

    // Get chat rooms where user is a participant
    const filter: any = {
      workspaceId,
      participants: auth.user._id,
    }

    // Only filter out archived if not explicitly including them
    if (!includeArchived) {
      filter.isArchived = false
    }

    const chatRooms = await ChatRoom.find(filter)
      .populate('participants', 'name email avatar')
      .populate('admins', 'name email avatar')
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })

    return NextResponse.json({ chatRooms })
  } catch (error) {
    console.error('Get chat rooms error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
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
    const { name, description, type, participants, workspaceId } = await request.json()

    if (!name || !workspaceId) {
      return NextResponse.json(
        { message: 'Name and workspace ID are required' },
        { status: 400 }
      )
    }

    // Verify user is member of workspace
    const member = await WorkspaceMember.findOne({
      userId: auth.user._id,
      workspaceId,
      status: 'active',
    })

    if (!member) {
      return NextResponse.json(
        { message: 'Not authorized for this workspace' },
        { status: 403 }
      )
    }

    // Check if chat room with same name exists in workspace
    const existingRoom = await ChatRoom.findOne({
      workspaceId,
      name,
      type: type || 'general',
    })

    if (existingRoom) {
      return NextResponse.json(
        { message: 'Chat room with this name already exists' },
        { status: 409 }
      )
    }

    // Create new chat room
    const chatRoom = new ChatRoom({
      name,
      description,
      type: type || 'general',
      workspaceId,
      participants: participants ? [auth.user._id, ...participants] : [auth.user._id],
      admins: [auth.user._id],
      createdBy: auth.user._id,
    })

    await chatRoom.save()

    const populatedRoom = await ChatRoom.findById(chatRoom._id)
      .populate('participants', 'name email avatar')
      .populate('admins', 'name email avatar')

    return NextResponse.json({ chatRoom: populatedRoom }, { status: 201 })
  } catch (error) {
    console.error('Create chat room error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}