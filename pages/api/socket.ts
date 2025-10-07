import { NextApiRequest, NextApiResponse } from 'next'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

interface SocketServer extends NetServer {
  io?: SocketIOServer
}

interface SocketApiResponse extends NextApiResponse {
  socket: {
    server: SocketServer
  } & NextApiResponse['socket']
}

export default function handler(req: NextApiRequest, res: SocketApiResponse) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...')

    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: '*', // Configure based on your needs
        methods: ['GET', 'POST'],
      },
    })

    // Handle client connections
    io.on('connection', socket => {
      console.log('User connected:', socket.id)

      // Store user data when they identify themselves
      socket.on(
        'identify-user',
        (data: { userId: string; userName: string; workspaceId: string }) => {
          console.log(
            `User identified: ${data.userName} (${data.userId}) in workspace ${data.workspaceId}`
          )

          // Store user data in socket
          socket.data = {
            userId: data.userId,
            userName: data.userName,
            workspaceId: data.workspaceId,
            rooms: new Set(),
          }

          // Join workspace room
          socket.join(`workspace:${data.workspaceId}`)

          // Emit success
          socket.emit('user-identified', { success: true })
        }
      )

      // Join a specific chat room
      socket.on('join-chat', (chatRoomId: string) => {
        socket.join(`chat:${chatRoomId}`)
        if (socket.data?.rooms) {
          socket.data.rooms.add(chatRoomId)
        }
        console.log(`User ${socket.id} joined chat room ${chatRoomId}`)
        socket.emit('joined-chat', chatRoomId)

        // Notify others in the room
        if (socket.data?.userName) {
          socket.to(`chat:${chatRoomId}`).emit('user-joined-room', {
            userId: socket.data.userId,
            userName: socket.data.userName,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Leave a chat room
      socket.on('leave-chat', (chatRoomId: string) => {
        socket.leave(`chat:${chatRoomId}`)
        if (socket.data?.rooms) {
          socket.data.rooms.delete(chatRoomId)
        }
        console.log(`User ${socket.id} left chat room ${chatRoomId}`)

        // Notify others in the room
        if (socket.data?.userName) {
          socket.to(`chat:${chatRoomId}`).emit('user-left-room', {
            userId: socket.data.userId,
            userName: socket.data.userName,
            timestamp: new Date().toISOString(),
          })
        }
      })

      // Handle new message
      socket.on(
        'send-message',
        (data: {
          chatRoomId: string
          content: string
          type?: 'text' | 'file' | 'image'
          replyTo?: string
          fileUrl?: string
          fileName?: string
          fileSize?: number
          tempId?: string
        }) => {
          console.log('Broadcasting message to chat:', data.chatRoomId)

          if (!socket.data?.userId) {
            socket.emit('error', { message: 'User not identified' })
            return
          }

          const messageData = {
            chatRoomId: data.chatRoomId,
            content: data.content,
            type: data.type || 'text',
            senderId: socket.data.userId,
            senderName: socket.data.userName,
            replyTo: data.replyTo,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            timestamp: new Date().toISOString(),
            tempId: data.tempId,
          }

          // Broadcast to all users in the chat room
          io.to(`chat:${data.chatRoomId}`).emit('new-message', messageData)
        }
      )

      // Handle typing indicators
      socket.on('typing-start', (data: { chatRoomId: string }) => {
        if (!socket.data?.userId) return

        socket.to(`chat:${data.chatRoomId}`).emit('user-typing', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          chatRoomId: data.chatRoomId,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('typing-stop', (data: { chatRoomId: string }) => {
        if (!socket.data?.userId) return

        socket.to(`chat:${data.chatRoomId}`).emit('user-stopped-typing', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          chatRoomId: data.chatRoomId,
        })
      })

      // Handle message reactions
      socket.on(
        'add-reaction',
        async (data: {
          messageId: string
          emoji: string
          chatRoomId: string
        }) => {
          console.log(
            'Socket received add-reaction:',
            data,
            'from user:',
            socket.data?.userName
          )

          if (!socket.data?.userId) {
            console.log('No user data found for reaction')
            return
          }

          const reactionData = {
            messageId: data.messageId,
            emoji: data.emoji,
            userId: socket.data.userId,
            userName: socket.data.userName,
          }

          console.log(
            'Broadcasting reaction to chat room:',
            data.chatRoomId,
            reactionData
          )

          // Broadcast to all users in the chat room including sender
          io.to(`chat:${data.chatRoomId}`).emit(
            'message-reaction-added',
            reactionData
          )
        }
      )

      // Handle message deletion
      socket.on(
        'delete-message',
        (data: { messageId: string; chatRoomId: string }) => {
          if (!socket.data?.userId) return

          // Broadcast to all users in the chat room including sender
          io.to(`chat:${data.chatRoomId}`).emit('message-deleted', {
            messageId: data.messageId,
            deletedBy: socket.data.userId,
          })
        }
      )

      // Handle user presence updates
      socket.on(
        'user-status-change',
        (data: { status: 'online' | 'offline' | 'away' }) => {
          if (!socket.data?.userId || !socket.data?.workspaceId) return

          socket
            .to(`workspace:${socket.data.workspaceId}`)
            .emit('user-status-updated', {
              userId: socket.data.userId,
              userName: socket.data.userName,
              status: data.status,
              timestamp: new Date().toISOString(),
            })
        }
      )

      // Handle read receipts
      socket.on(
        'mark-messages-read',
        (data: { chatRoomId: string; messageIds: string[] }) => {
          if (!socket.data?.userId) return

          socket.to(`chat:${data.chatRoomId}`).emit('messages-read', {
            chatRoomId: data.chatRoomId,
            messageIds: data.messageIds,
            userId: socket.data.userId,
            userName: socket.data.userName,
            timestamp: new Date().toISOString(),
          })
        }
      )

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)

        // Notify all rooms the user was in
        if (socket.data?.rooms && socket.data?.userName) {
          socket.data.rooms.forEach((chatRoomId: string) => {
            socket.to(`chat:${chatRoomId}`).emit('user-left-room', {
              userId: socket.data.userId,
              userName: socket.data.userName,
              timestamp: new Date().toISOString(),
            })
          })

          // Notify workspace of offline status
          if (socket.data?.workspaceId) {
            socket
              .to(`workspace:${socket.data.workspaceId}`)
              .emit('user-status-updated', {
                userId: socket.data.userId,
                userName: socket.data.userName,
                status: 'offline',
                timestamp: new Date().toISOString(),
              })
          }
        }
      })
    })

    res.socket.server.io = io
  } else {
    console.log('Socket.IO server already running')
  }

  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}
