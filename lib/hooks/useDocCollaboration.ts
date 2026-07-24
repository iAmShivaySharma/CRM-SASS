import { useEffect, useRef, useCallback, useState } from 'react'
import * as Y from 'yjs'
import { useSocket } from '@/lib/context/SocketContext'

interface CollaborationUser {
  userId: string
  userName: string
}

export function useDocCollaboration(documentId: string | null) {
  const ydocRef = useRef<Y.Doc | null>(null)
  const { socket } = useSocket() as any
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([])

  useEffect(() => {
    if (!documentId || !socket) return

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    socket.emit('doc-join', { documentId })

    ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'remote') {
        socket.emit('doc-update', {
          documentId,
          update: Array.from(update),
        })
      }
    })

    const handleRemoteUpdate = (data: { update: number[] }) => {
      const update = new Uint8Array(data.update)
      Y.applyUpdate(ydoc, update, 'remote')
    }

    const handleUserJoined = (user: CollaborationUser) => {
      setActiveUsers(prev => {
        if (prev.find(u => u.userId === user.userId)) return prev
        return [...prev, user]
      })
    }

    const handleUserLeft = (user: CollaborationUser) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId))
    }

    socket.on('doc-update', handleRemoteUpdate)
    socket.on('doc-user-joined', handleUserJoined)
    socket.on('doc-user-left', handleUserLeft)

    return () => {
      socket.emit('doc-leave', { documentId })
      socket.off('doc-update', handleRemoteUpdate)
      socket.off('doc-user-joined', handleUserJoined)
      socket.off('doc-user-left', handleUserLeft)
      ydoc.destroy()
      ydocRef.current = null
      setActiveUsers([])
    }
  }, [documentId, socket])

  const getYDoc = useCallback(() => ydocRef.current, [])

  return {
    ydoc: ydocRef.current,
    getYDoc,
    activeUsers,
  }
}
