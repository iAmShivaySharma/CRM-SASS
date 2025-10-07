import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Message, ChatRoom } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'

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
    const { chatRoomId, messageIds } = await request.json()

    if (!chatRoomId) {
      return NextResponse.json(
        { message: 'Chat room ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to chat room
    const chatRoom = await ChatRoom.findById(chatRoomId)

    if (!chatRoom) {
      return NextResponse.json(
        { message: 'Chat room not found' },
        { status: 404 }
      )
    }

    if (!chatRoom.participants.includes(auth.user._id)) {
      return NextResponse.json(
        { message: 'Not authorized to access this chat room' },
        { status: 403 }
      )
    }

    // Mark messages as read
    const filter =
      messageIds && messageIds.length > 0
        ? { _id: { $in: messageIds }, chatRoomId }
        : { chatRoomId, senderId: { $ne: auth.user._id } } // Mark all messages not sent by user

    await Message.updateMany(filter, {
      $addToSet: {
        readBy: {
          userId: auth.user._id,
          readAt: new Date(),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark messages read error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
