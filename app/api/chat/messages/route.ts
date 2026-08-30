import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Message, ChatRoom, WorkspaceMember } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { NotificationService } from '@/lib/services/notificationService'

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

    const skip = (page - 1) * limit
    const messages = await Message.find({ chatRoomId })
      .populate('replyTo', 'content senderName createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const totalMessages = await Message.countDocuments({ chatRoomId })
    const hasMore = skip + messages.length < totalMessages

    return NextResponse.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total: totalMessages,
        hasMore,
      },
    })
  } catch (error) {
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
    const { chatRoomId, content, type, fileUrl, fileName, fileSize, replyTo } =
      await request.json()

    if (!chatRoomId || !content) {
      return NextResponse.json(
        { message: 'Chat room ID and content are required' },
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
        { message: 'Not authorized to send messages to this chat room' },
        { status: 403 }
      )
    }

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
      readBy: [{ userId: auth.user._id, readAt: new Date() }],
    })

    await message.save()

    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: {
        content:
          content.length > 100 ? content.substring(0, 100) + '...' : content,
        senderId: auth.user._id,
        senderName: auth.user.fullName,
        timestamp: new Date(),
        type: type || 'text',
      },
    })

    const targetUserIds = chatRoom.participants
      .map((id: any) => id.toString())
      .filter((id: string) => id !== auth.user._id.toString())

    await NotificationService.createNotification({
      workspaceId: chatRoom.workspaceId,
      title: 'New Message',
      message: `${auth.user.fullName}: ${content.substring(0, 50)}`,
      type: 'info',
      entityType: 'message',
      entityId: message._id.toString(),
      createdBy: auth.user._id,
      notificationLevel: 'team',
      targetUserIds,
      excludeUserIds: [auth.user._id],
    }).catch(() => {})

    const populatedMessage = await Message.findById(message._id).populate(
      'replyTo',
      'content senderName createdAt'
    )

    return NextResponse.json({ message: populatedMessage }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
