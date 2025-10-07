'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Message } from '@/lib/api/chatApi'
import { useSocket } from '@/lib/context/SocketContext'
import { useAddReactionMutation } from '@/lib/api/chatApi'
import {
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Copy,
  File,
  Image as ImageIcon,
  ExternalLink,
  Smile,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface MessageItemProps {
  message: Message
  showAvatar: boolean
  chatRoomId: string
  onReply?: (message: Message) => void
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar,
  chatRoomId,
  onReply,
}) => {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false)
  const { addReaction: addReactionSocket, deleteMessage } = useSocket()
  const [addReactionApi] = useAddReactionMutation()

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }

    if (showFullTimestamp) {
      return format(date, 'PPpp')
    }
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getMessageInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleDeleteMessage = () => {
    deleteMessage({ messageId: message.id, chatRoomId })
  }

  const handleReply = () => {
    onReply?.(message)
  }

  const handleReaction = async (emoji: string) => {
    console.log('Adding reaction:', emoji, 'to message:', message.id)

    try {
      // First, broadcast via socket for immediate real-time update
      addReactionSocket({ messageId: message.id, emoji, chatRoomId })

      // Then persist to database in the background
      addReactionApi({ messageId: message.id, emoji, chatRoomId })
        .unwrap()
        .catch(error => {
          console.error('Failed to persist reaction to database:', error)
          // Could show a toast notification here
        })
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const renderMessageContent = () => {
    switch (message.type) {
      case 'file':
        return (
          <div className="flex max-w-sm items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
            <div className="flex-shrink-0 rounded-lg border border-border bg-background p-2">
              <File className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {message.fileName || 'Unknown file'}
              </p>
              {message.fileSize && (
                <p className="text-xs text-muted-foreground">
                  {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
            {message.fileUrl && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )

      case 'image':
        return (
          <div className="max-w-sm">
            {message.fileUrl ? (
              <div className="group relative overflow-hidden rounded-xl border border-border">
                <Image
                  src={message.fileUrl}
                  alt={message.fileName || 'Image'}
                  width={300}
                  height={200}
                  className="h-auto max-w-full transition-transform group-hover:scale-105"
                  style={{ objectFit: 'contain' }}
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex-shrink-0 rounded-lg border border-border bg-background p-2">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {message.fileName || 'Image'}
                  </p>
                  <p className="text-xs text-muted-foreground">Image file</p>
                </div>
              </div>
            )}
          </div>
        )

      case 'system':
        return (
          <div className="text-center">
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-xs"
            >
              {message.content}
            </Badge>
          </div>
        )

      default:
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="m-0 whitespace-pre-wrap break-words leading-relaxed text-foreground">
              {message.content}
            </p>
          </div>
        )
    }
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">{renderMessageContent()}</div>
    )
  }

  return (
    <div
      className={cn(
        'group -mx-4 flex gap-3 rounded-xl px-4 py-3 transition-all duration-200 hover:bg-muted/30',
        !showAvatar && 'mt-1'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.senderAvatar} />
            <AvatarFallback>
              {getMessageInitials(message.senderName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8" />
        )}
      </div>

      {/* Message Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        {showAvatar && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold">{message.senderName}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowFullTimestamp(!showFullTimestamp)}
                  >
                    {formatTimestamp(message.createdAt)}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {(() => {
                      const date = new Date(message.createdAt)
                      return isNaN(date.getTime())
                        ? 'Invalid date'
                        : format(date, 'PPpp')
                    })()}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {message.isEdited && (
              <Badge variant="outline" className="h-4 px-1 text-xs">
                edited
              </Badge>
            )}
          </div>
        )}

        {/* Reply indicator */}
        {message.replyTo && (
          <div className="mb-3 rounded-r-lg border-l-2 border-primary/50 bg-muted/20 py-2 pl-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              <Reply className="mr-1 inline h-3 w-3" />
              Replying to{' '}
              {typeof message.replyTo === 'object'
                ? message.replyTo.senderName
                : 'a message'}
            </p>
            <p className="truncate text-xs text-foreground/80">
              {typeof message.replyTo === 'object'
                ? message.replyTo.content
                : 'Original message not available'}
            </p>
          </div>
        )}

        {/* Message content */}
        <div className="mb-2">{renderMessageContent()}</div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(
              message.reactions.reduce(
                (acc, reaction) => {
                  if (!acc[reaction.emoji]) {
                    acc[reaction.emoji] = []
                  }
                  acc[reaction.emoji].push(reaction)
                  return acc
                },
                {} as Record<string, typeof message.reactions>
              )
            ).map(([emoji, reactions]) => (
              <Button
                key={emoji}
                variant="outline"
                size="sm"
                className="h-7 border-primary/20 bg-background/50 px-2 py-0 text-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10"
                onClick={() => handleReaction(emoji)}
              >
                <span className="mr-1">{emoji}</span>
                <span className="text-xs font-medium">{reactions.length}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      <div className="flex-shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/80 p-1 shadow-sm backdrop-blur-sm">
          {/* Quick reactions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-primary/10"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="grid grid-cols-6 gap-2">
                {[
                  '👍',
                  '❤️',
                  '😂',
                  '😮',
                  '😢',
                  '😡',
                  '🎉',
                  '🔥',
                  '💯',
                  '👏',
                  '✨',
                  '🚀',
                ].map(emoji => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    className="h-8 w-8 p-0 text-lg hover:bg-primary/10"
                    onClick={() => handleReaction(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-primary/10"
            onClick={handleReply}
          >
            <Reply className="h-4 w-4" />
          </Button>

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-primary/10"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCopyMessage}>
                <Copy className="mr-2 h-4 w-4" />
                Copy message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteMessage}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
