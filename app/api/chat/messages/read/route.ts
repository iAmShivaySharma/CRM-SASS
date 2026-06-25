import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Message, ChatRoom } from '@/lib/mongodb/models'
import { MessageRead } from '@/lib/mongodb/models/MessageRead'
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

    const filter =
      messageIds && messageIds.length > 0
        ? { _id: { $in: messageIds }, chatRoomId }
        : { chatRoomId, senderId: { $ne: auth.user._id } }

    const messages = await Message.find(filter).select('_id').lean()

    if (messages.length > 0) {
      const now = new Date()
      const ops = messages.map((msg: any) => ({
        updateOne: {
          filter: { messageId: msg._id.toString(), userId: auth.user._id },
          update: {
            $setOnInsert: {
              messageId: msg._id.toString(),
              chatRoomId,
              userId: auth.user._id,
              readAt: now,
            },
          },
          upsert: true,
        },
      }))
      await MessageRead.bulkWrite(ops, { ordered: false })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
