'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react'
import { io, Socket } from 'socket.io-client'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { Message, ChatRoom } from '../api/chatApi'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinChatRoom: (chatRoomId: string) => void
  leaveChatRoom: (chatRoomId: string) => void
  sendMessage: (data: {
    chatRoomId: string
    content: string
    type?: 'text' | 'file' | 'image'
    replyTo?: string
    fileUrl?: string
    fileName?: string
    fileSize?: number
    tempId?: string
  }) => void
  addReaction: (data: {
    messageId: string
    emoji: string
    chatRoomId: string
  }) => void
  deleteMessage: (data: { messageId: string; chatRoomId: string }) => void
  startTyping: (chatRoomId: string) => void
  stopTyping: (chatRoomId: string) => void
  markMessagesAsRead: (data: {
    chatRoomId: string
    messageIds: string[]
  }) => void
  changeUserStatus: (status: 'online' | 'offline' | 'away') => void
  onNewMessage: (callback: (message: Message) => void) => void
  onMessageReaction: (
    callback: (data: {
      messageId: string
      emoji: string
      userId: string
      userName: string
    }) => void
  ) => void
  onMessageDeleted: (
    callback: (data: { messageId: string; deletedBy: string }) => void
  ) => void
  onUserTyping: (
    callback: (data: {
      userId: string
      userName: string
      chatRoomId: string
    }) => void
  ) => void
  onUserStoppedTyping: (
    callback: (data: { userId: string; chatRoomId: string }) => void
  ) => void
  onMessagesRead: (
    callback: (data: {
      chatRoomId: string
      messageIds: string[]
      userId: string
      userName: string
    }) => void
  ) => void
  onUserStatusChanged: (
    callback: (data: {
      userId: string
      userName: string
      status: 'online' | 'offline' | 'away'
    }) => void
  ) => void
  onUserJoinedRoom: (
    callback: (data: {
      userId: string
      userName: string
      timestamp: string
    }) => void
  ) => void
  onUserLeftRoom: (
    callback: (data: {
      userId: string
      userName: string
      timestamp: string
    }) => void
  ) => void
}

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const auth = useSelector((state: RootState) => state.auth)
  const workspace = useSelector((state: RootState) => state.workspace)
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map())

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [socket])

  const initializeSocket = useCallback(async () => {
    try {
      const newSocket = io({
        path: '/api/socket',
        autoConnect: true,
      })

      newSocket.on('connect', () => {
        console.log('Connected to Socket.IO server')
        setIsConnected(true)

        // Identify user with server
        if (auth.user && workspace.currentWorkspace?.id) {
          newSocket.emit('identify-user', {
            userId: auth.user.id,
            workspaceId: workspace.currentWorkspace.id,
          })
        }
      })

      // Set up other event listeners...
      newSocket.on(
        'user-joined-room',
        (data: { userId: string; userName: string; timestamp: string }) => {
          console.log(`${data.userName} joined the room`)
        }
      )

      newSocket.on(
        'user-left-room',
        (data: { userId: string; userName: string; timestamp: string }) => {
          console.log(`${data.userName} left the room`)
        }
      )

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server')
        setIsConnected(false)
      })

      newSocket.on('connect_error', error => {
        console.error('Socket connection error:', error)
        setIsConnected(false)
      })

      // Set up event listeners
      const setupEventListeners = (socketInstance: Socket) => {
        // Clean up existing listeners
        eventListenersRef.current.clear()

        // Set up event handlers that will be exposed through the context
        const events = [
          'new-message',
          'message-reaction-added',
          'message-deleted',
          'user-typing',
          'user-stopped-typing',
          'messages-read',
          'user-status-updated',
          'user-joined-room',
          'user-left-room',
        ]

        events.forEach(event => {
          eventListenersRef.current.set(event, [])
        })
      }

      setupEventListeners(newSocket)

      setSocket(newSocket)
    } catch (error) {
      console.error('Failed to initialize socket:', error)
    }
  }, [auth.user, workspace.currentWorkspace])

  useEffect(() => {
    if (auth.isAuthenticated && auth.user && workspace.currentWorkspace?.id) {
      initializeSocket()
    } else {
      disconnectSocket()
    }

    return () => {
      disconnectSocket()
    }
  }, [
    auth.isAuthenticated,
    auth.user,
    workspace.currentWorkspace?.id,
    initializeSocket,
    disconnectSocket,
  ])

  const joinChatRoom = (chatRoomId: string) => {
    if (socket) {
      socket.emit('join-chat', chatRoomId)
    }
  }

  const leaveChatRoom = (chatRoomId: string) => {
    if (socket) {
      socket.emit('leave-chat', chatRoomId)
    }
  }

  const sendMessage = (data: {
    chatRoomId: string
    content: string
    type?: 'text' | 'file' | 'image'
    replyTo?: string
    fileUrl?: string
    fileName?: string
    fileSize?: number
    tempId?: string
  }) => {
    if (socket) {
      socket.emit('send-message', data)
    }
  }

  const addReaction = (data: {
    messageId: string
    emoji: string
    chatRoomId: string
  }) => {
    if (socket) {
      socket.emit('add-reaction', data)
    }
  }

  const deleteMessage = (data: { messageId: string; chatRoomId: string }) => {
    if (socket) {
      socket.emit('delete-message', data)
    }
  }

  const startTyping = (chatRoomId: string) => {
    if (socket) {
      socket.emit('typing-start', { chatRoomId })
    }
  }

  const stopTyping = (chatRoomId: string) => {
    if (socket) {
      socket.emit('typing-stop', { chatRoomId })
    }
  }

  const markMessagesAsRead = (data: {
    chatRoomId: string
    messageIds: string[]
  }) => {
    if (socket) {
      socket.emit('mark-messages-read', data)
    }
  }

  const changeUserStatus = (status: 'online' | 'offline' | 'away') => {
    if (socket) {
      socket.emit('user-status-change', { status })
    }
  }

  // Event listener registration methods
  const onNewMessage = (callback: (message: Message) => void) => {
    if (socket) {
      // Remove existing listener first to prevent duplicates
      socket.off('new-message', callback)
      socket.on('new-message', callback)

      const listeners = eventListenersRef.current.get('new-message') || []
      listeners.push(callback)
      eventListenersRef.current.set('new-message', listeners)
    }
  }

  const onMessageReaction = (
    callback: (data: {
      messageId: string
      emoji: string
      userId: string
      userName: string
    }) => void
  ) => {
    if (socket) {
      // Remove existing listener first to prevent duplicates
      socket.off('message-reaction-added', callback)
      socket.on('message-reaction-added', callback)

      const listeners =
        eventListenersRef.current.get('message-reaction-added') || []
      listeners.push(callback)
      eventListenersRef.current.set('message-reaction-added', listeners)
    }
  }

  const onMessageDeleted = (
    callback: (data: { messageId: string; deletedBy: string }) => void
  ) => {
    if (socket) {
      socket.off('message-deleted', callback)
      socket.on('message-deleted', callback)

      const listeners = eventListenersRef.current.get('message-deleted') || []
      listeners.push(callback)
      eventListenersRef.current.set('message-deleted', listeners)
    }
  }

  const onUserTyping = (
    callback: (data: {
      userId: string
      userName: string
      chatRoomId: string
    }) => void
  ) => {
    if (socket) {
      socket.off('user-typing', callback)
      socket.on('user-typing', callback)

      const listeners = eventListenersRef.current.get('user-typing') || []
      listeners.push(callback)
      eventListenersRef.current.set('user-typing', listeners)
    }
  }

  const onUserStoppedTyping = (
    callback: (data: { userId: string; chatRoomId: string }) => void
  ) => {
    if (socket) {
      socket.off('user-stopped-typing', callback)
      socket.on('user-stopped-typing', callback)

      const listeners =
        eventListenersRef.current.get('user-stopped-typing') || []
      listeners.push(callback)
      eventListenersRef.current.set('user-stopped-typing', listeners)
    }
  }

  const onMessagesRead = (
    callback: (data: {
      chatRoomId: string
      messageIds: string[]
      userId: string
      userName: string
    }) => void
  ) => {
    if (socket) {
      socket.on('messages-read', callback)
      const listeners = eventListenersRef.current.get('messages-read') || []
      listeners.push(callback)
      eventListenersRef.current.set('messages-read', listeners)
    }
  }

  const onUserStatusChanged = (
    callback: (data: {
      userId: string
      userName: string
      status: 'online' | 'offline' | 'away'
    }) => void
  ) => {
    if (socket) {
      socket.on('user-status-updated', callback)
      const listeners =
        eventListenersRef.current.get('user-status-updated') || []
      listeners.push(callback)
      eventListenersRef.current.set('user-status-updated', listeners)
    }
  }

  const onUserJoinedRoom = (
    callback: (data: {
      userId: string
      userName: string
      timestamp: string
    }) => void
  ) => {
    if (socket) {
      socket.on('user-joined-room', callback)
      const listeners = eventListenersRef.current.get('user-joined-room') || []
      listeners.push(callback)
      eventListenersRef.current.set('user-joined-room', listeners)
    }
  }

  const onUserLeftRoom = (
    callback: (data: {
      userId: string
      userName: string
      timestamp: string
    }) => void
  ) => {
    if (socket) {
      socket.on('user-left-room', callback)
      const listeners = eventListenersRef.current.get('user-left-room') || []
      listeners.push(callback)
      eventListenersRef.current.set('user-left-room', listeners)
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    joinChatRoom,
    leaveChatRoom,
    sendMessage,
    addReaction,
    deleteMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    changeUserStatus,
    onNewMessage,
    onMessageReaction,
    onMessageDeleted,
    onUserTyping,
    onUserStoppedTyping,
    onMessagesRead,
    onUserStatusChanged,
    onUserJoinedRoom,
    onUserLeftRoom,
  }

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}
