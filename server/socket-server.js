const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server: SocketIOServer } = require('socket.io')

const config = {
  dev: process.env.NODE_ENV !== 'production',
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: parseInt(process.env.PORT, 10) || 3000,
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()) || [],
  shutdownTimeout: 10000,
}

const app = next({
  dev: config.dev,
  hostname: config.hostname,
  port: config.port,
})
const handle = app.getRequestHandler()

function connectRedisAdapter(io) {
  if (!process.env.REDIS_URL) return

  const { createAdapter } = require('@socket.io/redis-adapter')
  const { createClient } = require('redis')

  const pub = createClient({ url: process.env.REDIS_URL })
  const sub = pub.duplicate()

  Promise.all([pub.connect(), sub.connect()])
    .then(() => {
      io.adapter(createAdapter(pub, sub))
      console.log('[socket.io] Redis adapter connected')
    })
    .catch(err => {
      console.error('[socket.io] Redis adapter failed:', err.message)
    })
}

function isIdentified(socket) {
  return !!socket.data?.userId
}

function broadcastToRoom(socket, room, event, payload) {
  socket.to(room).emit(event, payload)
}

function handleConnection(io, socket) {
  socket.on('identify-user', data => {
    if (!data?.userId || !data?.workspaceId) {
      socket.emit('error', { message: 'userId and workspaceId are required' })
      return
    }
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
      broadcastToRoom(socket, `chat:${chatRoomId}`, 'user-joined-room', {
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
      broadcastToRoom(socket, `chat:${chatRoomId}`, 'user-left-room', {
        userId: socket.data.userId,
        userName: socket.data.userName,
        timestamp: new Date().toISOString(),
      })
    }
  })

  socket.on('send-message', data => {
    if (!isIdentified(socket)) {
      return socket.emit('error', { message: 'Not identified' })
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
    if (!isIdentified(socket)) return
    broadcastToRoom(socket, `chat:${data.chatRoomId}`, 'user-typing', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      chatRoomId: data.chatRoomId,
      timestamp: new Date().toISOString(),
    })
  })

  socket.on('typing-stop', data => {
    if (!isIdentified(socket)) return
    broadcastToRoom(socket, `chat:${data.chatRoomId}`, 'user-stopped-typing', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      chatRoomId: data.chatRoomId,
    })
  })

  socket.on('add-reaction', data => {
    if (!isIdentified(socket)) return
    io.to(`chat:${data.chatRoomId}`).emit('message-reaction-added', {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: socket.data.userId,
      userName: socket.data.userName,
    })
  })

  socket.on('delete-message', data => {
    if (!isIdentified(socket)) return
    io.to(`chat:${data.chatRoomId}`).emit('message-deleted', {
      messageId: data.messageId,
      deletedBy: socket.data.userId,
    })
  })

  socket.on('user-status-change', data => {
    if (!isIdentified(socket) || !socket.data.workspaceId) return
    broadcastToRoom(
      socket,
      `workspace:${socket.data.workspaceId}`,
      'user-status-updated',
      {
        userId: socket.data.userId,
        userName: socket.data.userName,
        status: data.status,
        timestamp: new Date().toISOString(),
      }
    )
  })

  socket.on('mark-messages-read', data => {
    if (!isIdentified(socket)) return
    broadcastToRoom(socket, `chat:${data.chatRoomId}`, 'messages-read', {
      chatRoomId: data.chatRoomId,
      messageIds: data.messageIds,
      userId: socket.data.userId,
      userName: socket.data.userName,
      timestamp: new Date().toISOString(),
    })
  })

  socket.on('disconnect', () => {
    if (!socket.data?.rooms || !socket.data?.userName) return
    socket.data.rooms.forEach(chatRoomId => {
      broadcastToRoom(socket, `chat:${chatRoomId}`, 'user-left-room', {
        userId: socket.data.userId,
        userName: socket.data.userName,
        timestamp: new Date().toISOString(),
      })
    })
    if (socket.data.workspaceId) {
      broadcastToRoom(
        socket,
        `workspace:${socket.data.workspaceId}`,
        'user-status-updated',
        {
          userId: socket.data.userId,
          userName: socket.data.userName,
          status: 'offline',
          timestamp: new Date().toISOString(),
        }
      )
    }
  })
}

app.prepare().then(() => {
  const server = createServer((req, res) =>
    handle(req, res, parse(req.url, true))
  )

  const io = new SocketIOServer(server, {
    path: '/api/socket',
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  connectRedisAdapter(io)
  io.on('connection', socket => handleConnection(io, socket))

  server.listen(config.port, config.hostname, () => {
    console.log(
      `> CRM Pro running on http://${config.hostname}:${config.port} [${config.dev ? 'development' : 'production'}]`
    )
  })

  const shutdown = signal => {
    console.log(`> ${signal} received, shutting down gracefully...`)
    io.close(() => server.close(() => process.exit(0)))
    setTimeout(() => process.exit(1), config.shutdownTimeout)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
})
