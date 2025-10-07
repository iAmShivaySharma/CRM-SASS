import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Message, ChatRoom } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'

// Add reaction to message
export async function POST(
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

    const { emoji, chatRoomId } = await request.json()
    const { messageId } = await params

    if (!emoji || !chatRoomId) {
      return NextResponse.json(
        { message: 'Emoji and chat room ID are required' },
        { status: 400 }
      )
    }

    // Verify user has access to chat room
    const chatRoom = await ChatRoom.findById(chatRoomId)
    if (!chatRoom || !chatRoom.participants.includes(auth.user._id)) {
      return NextResponse.json(
        { message: 'Not authorized to access this chat room' },
        { status: 403 }
      )
    }

    // Find the message
    const message = await Message.findById(messageId)
    if (!message || message.chatRoomId !== chatRoomId) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      )
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      (reaction: any) =>
        reaction.emoji === emoji && reaction.userId === auth.user._id
    )

    if (existingReactionIndex >= 0) {
      // Remove existing reaction
      message.reactions.splice(existingReactionIndex, 1)
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        userId: auth.user._id,
        userName: auth.user.fullName || auth.user.email,
      })
    }

    await message.save()

    return NextResponse.json({
      success: true,
      reactions: message.reactions,
    })
  } catch (error) {
    console.error('Add reaction error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove reaction from message
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

    const { emoji, chatRoomId } = await request.json()
    const { messageId } = await params

    if (!emoji || !chatRoomId) {
      return NextResponse.json(
        { message: 'Emoji and chat room ID are required' },
        { status: 400 }
      )
    }

    // Verify user has access to chat room
    const chatRoom = await ChatRoom.findById(chatRoomId)
    if (!chatRoom || !chatRoom.participants.includes(auth.user._id)) {
      return NextResponse.json(
        { message: 'Not authorized to access this chat room' },
        { status: 403 }
      )
    }

    // Find the message
    const message = await Message.findById(messageId)
    if (!message || message.chatRoomId !== chatRoomId) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      )
    }

    // Remove the reaction
    message.reactions = message.reactions.filter(
      (reaction: any) =>
        !(reaction.emoji === emoji && reaction.userId === auth.user._id)
    )

    await message.save()

    return NextResponse.json({
      success: true,
      reactions: message.reactions,
    })
  } catch (error) {
    console.error('Remove reaction error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
