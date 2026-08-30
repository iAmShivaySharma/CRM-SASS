import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Message, ChatRoom } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { deleteFile } from '@/lib/storage'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await params
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      )
    }

    const message = await Message.findById(messageId)
    if (!message) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.senderId.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        { message: 'Not authorized to edit this message' },
        { status: 403 }
      )
    }

    message.content = content.trim()
    message.isEdited = true
    message.editedAt = new Date()
    await message.save()

    return NextResponse.json({
      success: true,
      message: {
        id: message._id,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await params
    const { searchParams } = new URL(request.url)
    const chatRoomId = searchParams.get('chatRoomId')

    if (!chatRoomId) {
      return NextResponse.json(
        { message: 'Chat room ID is required' },
        { status: 400 }
      )
    }

    const message = await Message.findById(messageId)
    if (!message) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.senderId.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        { message: 'Not authorized to delete this message' },
        { status: 403 }
      )
    }

    if (message.fileUrl) {
      try {
        const url = new URL(message.fileUrl)
        const filePath = url.pathname.replace(/^\//, '')
        await deleteFile(filePath)
      } catch {}
    }

    await Message.findByIdAndDelete(messageId)

    const lastMsg = (await Message.findOne({ chatRoomId })
      .sort({ createdAt: -1 })
      .lean()) as any

    if (lastMsg) {
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: {
          content:
            lastMsg.content.length > 100
              ? lastMsg.content.substring(0, 100) + '...'
              : lastMsg.content,
          senderId: lastMsg.senderId,
          senderName: lastMsg.senderName,
          timestamp: lastMsg.createdAt,
          type: lastMsg.type || 'text',
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
