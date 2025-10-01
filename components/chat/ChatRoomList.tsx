'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChatRoom } from '@/lib/api/chatApi'
import { Hash, Lock, Users, Plus } from 'lucide-react'

interface ChatRoomListProps {
  chatRooms: ChatRoom[]
  selectedChatRoom: string | null
  onChatRoomSelect: (chatRoomId: string) => void
  onInitializeDefaults?: () => void
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  chatRooms,
  selectedChatRoom,
  onChatRoomSelect,
  onInitializeDefaults,
}) => {
  const getChatRoomIcon = (type: ChatRoom['type']) => {
    switch (type) {
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'direct':
        return <Users className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const getChatRoomInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''

    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return ''
    }
  }

  const truncateMessage = (content: string | undefined, maxLength: number = 50) => {
    if (!content) return ''
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  if (chatRooms.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Hash className="mx-auto h-8 w-8 mb-2" />
        <p className="mb-4">No chat rooms found</p>
        {onInitializeDefaults && (
          <Button onClick={onInitializeDefaults} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create General Room
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {chatRooms.map((chatRoom) => {
        const isSelected = selectedChatRoom === chatRoom.id
        const hasUnreadMessages = false // TODO: Implement unread message count
        const unreadCount = 0 // TODO: Implement unread message count

        return (
          <button
            key={chatRoom.id}
            onClick={() => onChatRoomSelect(chatRoom.id)}
            className={cn(
              "w-full text-left p-3 rounded-lg transition-colors hover:bg-accent/50",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isSelected && "bg-accent"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Chat Room Avatar */}
              <div className="relative">
                {chatRoom.type === 'direct' ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {getChatRoomInitials(chatRoom.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    "bg-primary/10 text-primary"
                  )}>
                    {getChatRoomIcon(chatRoom.type)}
                  </div>
                )}

                {/* Online indicator for direct messages */}
                {chatRoom.type === 'direct' && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>

              {/* Chat Room Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={cn(
                    "text-sm font-medium truncate",
                    hasUnreadMessages && "font-semibold"
                  )}>
                    {chatRoom.name}
                  </h4>

                  <div className="flex items-center gap-2">
                    {chatRoom.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatLastMessageTime(chatRoom.lastMessage.timestamp)}
                      </span>
                    )}

                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-[20px] text-xs">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Last Message Preview */}
                {chatRoom.lastMessage ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {chatRoom.lastMessage.senderName}:
                    </span>
                    <span className={cn(
                      "text-xs text-muted-foreground truncate",
                      hasUnreadMessages && "font-medium text-foreground"
                    )}>
                      {chatRoom.lastMessage?.type === 'text'
                        ? truncateMessage(chatRoom.lastMessage?.content)
                        : `Sent a ${chatRoom.lastMessage?.type || 'file'}`
                      }
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No messages yet
                  </span>
                )}

                {/* Chat Room Type Badge */}
                {chatRoom.type !== 'general' && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge
                      variant="outline"
                      className="text-xs px-1 py-0 h-4"
                    >
                      {chatRoom.type}
                    </Badge>

                    {chatRoom.participants && Array.isArray(chatRoom.participants) && (
                      <span className="text-xs text-muted-foreground">
                        {chatRoom.participants.length} members
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}