'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useGetMessagesQuery } from '@/lib/api/chatApi'
import { useSocket } from '@/lib/context/SocketContext'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChatMessagesListSkeleton, ChatMessageSkeleton } from '@/components/ui/skeleton'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from './TypingIndicator'
import { Loader2, MessageSquare } from 'lucide-react'
import { Message } from '@/lib/api/chatApi'

interface MessageListProps {
  chatRoomId: string
  onReply?: (message: Message) => void
}

export const MessageList: React.FC<MessageListProps> = ({
  chatRoomId,
  onReply,
}) => {
  const [page, setPage] = useState(1)
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([])
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const {
    data: messagesData,
    isLoading,
    error,
    isFetching,
  } = useGetMessagesQuery(
    { chatRoomId, page, limit: 50 },
    { skip: !chatRoomId }
  )

  const {
    onNewMessage,
    onUserTyping,
    onUserStoppedTyping,
    onMessageReaction,
    onMessageDeleted,
    markMessagesAsRead,
  } = useSocket()

  // Update messages when new data comes in
  useEffect(() => {
    if (messagesData?.messages) {
      if (page === 1) {
        setAllMessages(messagesData.messages)
      } else {
        setAllMessages(prev => [...messagesData.messages, ...prev])
      }
    }
  }, [messagesData, page])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [allMessages, autoScroll])

  // Handle real-time message updates
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message.chatRoomId === chatRoomId) {
        // Check if message already exists to prevent duplicates
        setAllMessages(prev => {
          const exists = prev.some(
            msg =>
              msg.id === message.id ||
              ((message as any).tempId && msg.id === (message as any).tempId)
          )
          if (!exists) {
            return [...prev, message]
          }
          return prev
        })
        setAutoScroll(true)
      }
    }

    const handleMessageReaction = (data: {
      messageId: string
      emoji: string
      userId: string
      userName: string
    }) => {
      console.log('Received reaction:', data) // Debug log
      setAllMessages(prev => {
        const updatedMessages = prev.map(message => {
          if (message.id === data.messageId) {
            const existingReactionIndex = message.reactions.findIndex(
              r => r.emoji === data.emoji && r.userId === data.userId
            )

            if (existingReactionIndex >= 0) {
              // Remove reaction if it already exists
              console.log('Removing existing reaction')
              return {
                ...message,
                reactions: message.reactions.filter(
                  (_, index) => index !== existingReactionIndex
                ),
              }
            } else {
              // Add new reaction
              console.log('Adding new reaction')
              return {
                ...message,
                reactions: [
                  ...message.reactions,
                  {
                    emoji: data.emoji,
                    userId: data.userId,
                    userName: data.userName,
                  },
                ],
              }
            }
          }
          return message
        })
        console.log('Updated messages:', updatedMessages)
        return updatedMessages
      })
    }

    const handleMessageDeleted = (data: {
      messageId: string
      deletedBy: string
    }) => {
      setAllMessages(prev =>
        prev.filter(message => message.id !== data.messageId)
      )
    }

    const handleUserTyping = (data: {
      userId: string
      userName: string
      chatRoomId: string
    }) => {
      if (data.chatRoomId === chatRoomId) {
        setTypingUsers(prev => {
          const exists = prev.some(user => user.userId === data.userId)
          if (!exists) {
            return [...prev, { userId: data.userId, userName: data.userName }]
          }
          return prev
        })

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev =>
            prev.filter(user => user.userId !== data.userId)
          )
        }, 3000)
      }
    }

    const handleUserStoppedTyping = (data: {
      userId: string
      chatRoomId: string
    }) => {
      if (data.chatRoomId === chatRoomId) {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId))
      }
    }

    // Register event listeners
    if (onNewMessage) onNewMessage(handleNewMessage)
    if (onMessageReaction) onMessageReaction(handleMessageReaction)
    if (onMessageDeleted) onMessageDeleted(handleMessageDeleted)
    if (onUserTyping) onUserTyping(handleUserTyping)
    if (onUserStoppedTyping) onUserStoppedTyping(handleUserStoppedTyping)

    // Cleanup function
    return () => {
      // The socket context should handle cleanup, but we can add additional cleanup here if needed
      console.log('Cleaning up message list event listeners')
    }
  }, [
    chatRoomId,
    onMessageDeleted,
    onMessageReaction,
    onNewMessage,
    onUserStoppedTyping,
    onUserTyping,
  ])

  // Mark messages as read when component mounts or chatRoomId changes
  useEffect(() => {
    if (chatRoomId && allMessages.length > 0) {
      const messageIds = allMessages.map(msg => msg.id)
      markMessagesAsRead({ chatRoomId, messageIds })
    }
  }, [chatRoomId, allMessages, markMessagesAsRead])

  // Handle scroll events for auto-scroll behavior
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100 // 100px threshold
    setAutoScroll(isAtBottom)
  }

  // Load more messages when scrolling to top
  const handleLoadMore = () => {
    if (!isFetching && messagesData?.pagination.hasMore) {
      setPage(prev => prev + 1)
    }
  }

  if (isLoading && page === 1) {
    return (
      <div className="flex-1 px-4 py-4">
        <ChatMessagesListSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <p className="text-destructive">Failed to load messages</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 px-4"
        onScrollCapture={handleScroll}
      >
        <div className="space-y-4 py-4">
          {/* Load More Button */}
          {messagesData?.pagination.hasMore && (
            <div className="text-center">
              {isFetching ? (
                <ChatMessageSkeleton />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="text-muted-foreground"
                >
                  Load more messages
                </Button>
              )}
            </div>
          )}

          {/* Messages */}
          {allMessages.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No messages yet</h3>
              <p className="text-muted-foreground">
                Be the first to send a message in this chat room
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allMessages.map((message, index) => {
                const previousMessage =
                  index > 0 ? allMessages[index - 1] : null
                const showAvatar =
                  !previousMessage ||
                  previousMessage.senderId !== message.senderId ||
                  new Date(message.createdAt).getTime() -
                    new Date(previousMessage.createdAt).getTime() >
                    300000 // 5 minutes

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                    chatRoomId={chatRoomId}
                    onReply={onReply}
                  />
                )
              })}
            </div>
          )}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <div className="absolute bottom-20 right-6">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg"
            onClick={() => {
              setAutoScroll(true)
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Scroll to bottom
          </Button>
        </div>
      )}
    </div>
  )
}
