import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Message, ChatRoom, WorkspaceMember } from '@/lib/mongodb/models'
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
    const chatRoomId = searchParams.get('chatRoomId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

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

    // Get messages with pagination
    const skip = (page - 1) * limit
    const messages = await Message.find({ chatRoomId })
      .populate('replyTo', 'content senderName createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const totalMessages = await Message.countDocuments({ chatRoomId })
    const hasMore = skip + messages.length < totalMessages

    return NextResponse.json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total: totalMessages,
        hasMore,
      },
    })
  } catch (error) {
    console.error('Get messages error:', error)
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
    const {
      chatRoomId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      replyTo,
    } = await request.json()

    if (!chatRoomId || !content) {
      return NextResponse.json(
        { message: 'Chat room ID and content are required' },
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
        { message: 'Not authorized to send messages to this chat room' },
        { status: 403 }
      )
    }

    // Create new message
    const message = new Message({
      content,
      type: type || 'text',
      chatRoomId,
      senderId: auth.user._id,
      senderName: auth.user.fullName,
      fileUrl,
      fileName,
      fileSize,
      replyTo,
      readBy: [{ userId: auth.user._id, readAt: new Date() }], // Mark as read by sender
    })

    await message.save()

    // Update chat room's last message
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: {
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        senderId: auth.user._id,
        senderName: auth.user.fullName,
        timestamp: new Date(),
        type: type || 'text',
      },
    })

    const populatedMessage = await Message.findById(message._id)
      .populate('replyTo', 'content senderName createdAt')

    return NextResponse.json({ message: populatedMessage }, { status: 201 })
  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}