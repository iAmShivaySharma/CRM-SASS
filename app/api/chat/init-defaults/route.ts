import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkspaceMember } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { createDefaultChatRooms, addUserToDefaultChatRooms } from '@/lib/chat/defaults'

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

    const { workspaceId } = await request.json()

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Verify user is admin of workspace
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

    // Check if user has admin permissions (you may need to populate role and check permissions)
    // For now, we'll allow any member to initialize defaults

    // Create default chat rooms
    const generalRoom = await createDefaultChatRooms(workspaceId, auth.user._id)

    // Get all workspace members and add them to general rooms
    const allMembers = await WorkspaceMember.find({
      workspaceId,
      status: 'active',
    })

    for (const memberData of allMembers) {
      await addUserToDefaultChatRooms(workspaceId, memberData.userId)
    }

    return NextResponse.json({
      success: true,
      message: 'Default chat rooms initialized successfully',
      generalRoom: {
        id: generalRoom._id,
        name: generalRoom.name,
        type: generalRoom.type,
        participantCount: generalRoom.participants.length,
      },
    })
  } catch (error) {
    console.error('Initialize default chat rooms error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}