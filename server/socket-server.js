const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server: SocketIOServer } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT, 10) || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new SocketIOServer(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter')
      const { createClient } = require('redis')
      const pubClient = createClient({ url: process.env.REDIS_URL })
      const subClient = pubClient.duplicate()
      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient))
          console.log('[socket.io] Redis adapter connected')
        })
        .catch(() => {
          console.log('[socket.io] Redis adapter failed, using in-memory')
        })
    } catch {
      console.log('[socket.io] Redis adapter not available, using in-memory')
    }
  }

  io.on('connection', socket => {
    socket.on('identify-user', data => {
      socket.data = {
        userId: data.userId,
        userName: data.userName,
        workspaceId: data.workspaceId,
        rooms: new Set(),
      }
      socket.join(`workspace:${data.workspaceId}`)
      socket.emit('user-identified', { success: true })
    })

    socket.on('join-chat', chatRoomId => {
      socket.join(`chat:${chatRoomId}`)
      if (socket.data?.rooms) socket.data.rooms.add(chatRoomId)
      socket.emit('joined-chat', chatRoomId)
      if (socket.data?.userName) {
        socket.to(`chat:${chatRoomId}`).emit('user-joined-room', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          timestamp: new Date().toISOString(),
        })
      }
    })

    socket.on('leave-chat', chatRoomId => {
      socket.leave(`chat:${chatRoomId}`)
      if (socket.data?.rooms) socket.data.rooms.delete(chatRoomId)
      if (socket.data?.userName) {
        socket.to(`chat:${chatRoomId}`).emit('user-left-room', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          timestamp: new Date().toISOString(),
        })
      }
    })

    socket.on('send-message', data => {
      if (!socket.data?.userId) {
        socket.emit('error', { message: 'User not identified' })
        return
      }
      io.to(`chat:${data.chatRoomId}`).emit('new-message', {
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
      })
    })

    socket.on('typing-start', data => {
      if (!socket.data?.userId) return
      socket.to(`chat:${data.chatRoomId}`).emit('user-typing', {
        userId: socket.data.userId,
        userName: socket.data.userName,
        chatRoomId: data.chatRoomId,
        timestamp: new Date().toISOString(),
      })
    })

    socket.on('typing-stop', data => {
      if (!socket.data?.userId) return
      socket.to(`chat:${data.chatRoomId}`).emit('user-stopped-typing', {
        userId: socket.data.userId,
        userName: socket.data.userName,
        chatRoomId: data.chatRoomId,
      })
    })

    socket.on('add-reaction', data => {
      if (!socket.data?.userId) return
      io.to(`chat:${data.chatRoomId}`).emit('message-reaction-added', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: socket.data.userId,
        userName: socket.data.userName,
      })
    })

    socket.on('delete-message', data => {
      if (!socket.data?.userId) return
      io.to(`chat:${data.chatRoomId}`).emit('message-deleted', {
        messageId: data.messageId,
        deletedBy: socket.data.userId,
      })
    })

    socket.on('user-status-change', data => {
      if (!socket.data?.userId || !socket.data?.workspaceId) return
      socket
        .to(`workspace:${socket.data.workspaceId}`)
        .emit('user-status-updated', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          status: data.status,
          timestamp: new Date().toISOString(),
        })
    })

    socket.on('mark-messages-read', data => {
      if (!socket.data?.userId) return
      socket.to(`chat:${data.chatRoomId}`).emit('messages-read', {
        chatRoomId: data.chatRoomId,
        messageIds: data.messageIds,
        userId: socket.data.userId,
        userName: socket.data.userName,
        timestamp: new Date().toISOString(),
      })
    })

    socket.on('doc-join', data => {
      if (!socket.data?.userId || !data.documentId) return
      const room = `doc:${data.documentId}`
      socket.join(room)
      socket.to(room).emit('doc-user-joined', {
        userId: socket.data.userId,
        userName: socket.data.userName,
      })
    })

    socket.on('doc-leave', data => {
      if (!data.documentId) return
      const room = `doc:${data.documentId}`
      socket.leave(room)
      if (socket.data?.userId) {
        socket.to(room).emit('doc-user-left', {
          userId: socket.data.userId,
          userName: socket.data.userName,
        })
      }
    })

    socket.on('doc-update', data => {
      if (!socket.data?.userId || !data.documentId || !data.update) return
      socket.to(`doc:${data.documentId}`).emit('doc-update', {
        update: data.update,
        userId: socket.data.userId,
      })
    })

    socket.on('doc-awareness', data => {
      if (!socket.data?.userId || !data.documentId) return
      socket.to(`doc:${data.documentId}`).emit('doc-awareness', {
        state: data.state,
        userId: socket.data.userId,
        userName: socket.data.userName,
      })
    })

    socket.on('disconnect', () => {
      if (socket.data?.rooms && socket.data?.userName) {
        socket.data.rooms.forEach(chatRoomId => {
          socket.to(`chat:${chatRoomId}`).emit('user-left-room', {
            userId: socket.data.userId,
            userName: socket.data.userName,
            timestamp: new Date().toISOString(),
          })
        })
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

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
