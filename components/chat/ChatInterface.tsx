'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { useGetChatRoomsQuery, useGetMessagesQuery } from '@/lib/api/chatApi'
import { useSocket } from '@/lib/context/SocketContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ListItemSkeleton, InputSkeleton } from '@/components/ui/skeleton'
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Settings,
  Search,
  Archive,
} from 'lucide-react'
import { ChatRoomList } from './ChatRoomList'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ChatHeader } from './ChatHeader'
import { CreateChatRoomDialog } from './CreateChatRoomDialog'
import { StartDirectChatDialog } from './StartDirectChatDialog'
import { Message } from '@/lib/api/chatApi'

interface ChatInterfaceProps {
  className?: string
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const workspace = useSelector((state: RootState) => state.workspace)
  const { isConnected, joinChatRoom, leaveChatRoom } = useSocket()

  const {
    data: chatRoomsData,
    isLoading: chatRoomsLoading,
    error: chatRoomsError,
  } = useGetChatRoomsQuery(
    {
      workspaceId: workspace.currentWorkspace?.id || '',
      includeArchived: showArchived,
    },
    { skip: !workspace.currentWorkspace?.id }
  )

  const chatRooms = useMemo(
    () => chatRoomsData?.chatRooms || [],
    [chatRoomsData?.chatRooms]
  )

  // Auto-select first chat room if none selected
  useEffect(() => {
    if (chatRooms.length > 0 && !selectedChatRoom) {
      setSelectedChatRoom(chatRooms[0].id)
    }
  }, [chatRooms, selectedChatRoom])

  // Join/leave chat rooms when selection changes
  useEffect(() => {
    if (selectedChatRoom && isConnected) {
      joinChatRoom(selectedChatRoom)
      return () => {
        if (selectedChatRoom) {
          leaveChatRoom(selectedChatRoom)
        }
      }
    }
  }, [selectedChatRoom, isConnected, joinChatRoom, leaveChatRoom])

  const handleChatRoomSelect = (chatRoomId: string) => {
    if (selectedChatRoom && selectedChatRoom !== chatRoomId) {
      leaveChatRoom(selectedChatRoom)
    }
    setSelectedChatRoom(chatRoomId)
    setIsMobileOpen(false)
  }

  const selectedRoom = chatRooms.find(room => room.id === selectedChatRoom)

  const filteredChatRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (chatRoomsLoading) {
    return (
      <div className={cn('flex h-full', className)}>
        {/* Chat rooms sidebar skeleton */}
        <div className="w-80 border-r bg-muted/10 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
          <InputSkeleton />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Chat messages area skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse mx-auto" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (chatRoomsError) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="text-destructive">Failed to load chat rooms</p>
        </div>
      </div>
    )
  }

  const handleInitializeDefaults = async () => {
    if (!workspace.currentWorkspace?.id) return

    try {
      const response = await fetch('/api/chat/init-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: workspace.currentWorkspace.id,
        }),
      })

      if (response.ok) {
        // Refetch chat rooms
        window.location.reload()
      } else {
        console.error('Failed to initialize default chat rooms')
      }
    } catch (error) {
      console.error('Error initializing default chat rooms:', error)
    }
  }

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Desktop Sidebar */}
      <div className="hidden border-r md:flex md:w-80 md:flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Chat Rooms</h2>
          <div className="flex items-center gap-2">
            <CreateChatRoomDialog />
            <StartDirectChatDialog
              onChatStarted={chatRoomId => setSelectedChatRoom(chatRoomId)}
              trigger={
                <Button size="sm" variant="ghost">
                  <Users className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>

        <div className="space-y-3 border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search chat rooms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm font-medium">
              <Archive className="mr-1 inline h-3 w-3" />
              Show archived chats
            </Label>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <ChatRoomList
            chatRooms={filteredChatRooms}
            selectedChatRoom={selectedChatRoom}
            onChatRoomSelect={handleChatRoomSelect}
            onInitializeDefaults={handleInitializeDefaults}
          />
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Chat Rooms</h2>
              <div className="flex items-center gap-2">
                <CreateChatRoomDialog />
                <StartDirectChatDialog
                  onChatStarted={chatRoomId => {
                    setSelectedChatRoom(chatRoomId)
                    setIsMobileOpen(false)
                  }}
                  trigger={
                    <Button size="sm" variant="ghost">
                      <Users className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="space-y-3 border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search chat rooms..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-archived-mobile"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label
                  htmlFor="show-archived-mobile"
                  className="text-sm font-medium"
                >
                  <Archive className="mr-1 inline h-3 w-3" />
                  Show archived chats
                </Label>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <ChatRoomList
                chatRooms={filteredChatRooms}
                selectedChatRoom={selectedChatRoom}
                onChatRoomSelect={handleChatRoomSelect}
                onInitializeDefaults={handleInitializeDefaults}
              />
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedRoom ? (
          <>
            <ChatHeader
              chatRoom={selectedRoom}
              onMobileMenuClick={() => setIsMobileOpen(true)}
            />

            <div className="flex min-h-0 flex-1 flex-col">
              <MessageList
                chatRoomId={selectedRoom.id}
                onReply={message => setReplyingTo(message)}
              />
              <MessageInput
                chatRoomId={selectedRoom.id}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">Select a chat room</h3>
              <p className="text-muted-foreground">
                Choose a chat room from the sidebar to start messaging
              </p>
              <Button
                className="mt-4 md:hidden"
                onClick={() => setIsMobileOpen(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                View Chat Rooms
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
