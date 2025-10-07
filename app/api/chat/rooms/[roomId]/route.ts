import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { ChatRoom, WorkspaceMember } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
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

    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

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

    // Get chat room and verify access
    const chatRoom = await ChatRoom.findOne({
      _id: roomId,
      workspaceId,
      participants: auth.user._id,
    })

    if (!chatRoom) {
      return NextResponse.json(
        { message: 'Chat room not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user is admin (only admins can update chat room settings)
    const isAdmin = chatRoom.admins.includes(auth.user._id)
    if (!isAdmin) {
      return NextResponse.json(
        { message: 'Only admins can update chat room settings' },
        { status: 403 }
      )
    }

    const updates = await request.json()

    // Apply updates
    Object.assign(chatRoom, updates)
    chatRoom.updatedAt = new Date()

    await chatRoom.save()

    const populatedRoom = await ChatRoom.findById(chatRoom._id)
      .populate('participants', 'name email avatar')
      .populate('admins', 'name email avatar')

    return NextResponse.json({ chatRoom: populatedRoom })
  } catch (error) {
    console.error('Update chat room error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
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

    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

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

    // Get chat room and verify access
    const chatRoom = await ChatRoom.findOne({
      _id: roomId,
      workspaceId,
      participants: auth.user._id,
    })

    if (!chatRoom) {
      return NextResponse.json(
        { message: 'Chat room not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user is admin and prevent deletion of general chat
    const isAdmin = chatRoom.admins.includes(auth.user._id)
    if (!isAdmin) {
      return NextResponse.json(
        { message: 'Only admins can delete chat rooms' },
        { status: 403 }
      )
    }

    if (chatRoom.type === 'general') {
      return NextResponse.json(
        { message: 'Cannot delete general chat room' },
        { status: 400 }
      )
    }

    await ChatRoom.findByIdAndDelete(roomId)

    return NextResponse.json({ message: 'Chat room deleted successfully' })
  } catch (error) {
    console.error('Delete chat room error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
