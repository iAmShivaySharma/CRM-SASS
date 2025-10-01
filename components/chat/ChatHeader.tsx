'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { ChatRoom, useUpdateChatRoomMutation, useDeleteChatRoomMutation } from '@/lib/api/chatApi'
import { ChatDetailsDialog } from './ChatDetailsDialog'
import { AddParticipantsDialog } from './AddParticipantsDialog'
import { ChatSettingsDialog } from './ChatSettingsDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Menu,
  Hash,
  Lock,
  Users,
  MoreVertical,
  UserPlus,
  Settings,
  Archive,
  Trash2,
  Volume2,
  VolumeX,
  Info
} from 'lucide-react'

interface ChatHeaderProps {
  chatRoom: ChatRoom
  onMobileMenuClick: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatRoom,
  onMobileMenuClick,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [addParticipantsDialogOpen, setAddParticipantsDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  const workspace = useSelector((state: RootState) => state.workspace)

  const [updateChatRoom] = useUpdateChatRoomMutation()
  const [deleteChatRoom] = useDeleteChatRoomMutation()
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

  const getParticipantCount = () => {
    if (Array.isArray(chatRoom.participants)) {
      return chatRoom.participants.length
    }
    return 0
  }

  const handleArchiveToggle = async () => {
    if (!workspace.currentWorkspace?.id) return

    try {
      await updateChatRoom({
        id: chatRoom.id,
        workspaceId: workspace.currentWorkspace.id,
        isArchived: !chatRoom.isArchived,
      }).unwrap()
    } catch (error) {
      console.error('Failed to toggle archive status:', error)
    }
  }

  const handleDelete = async () => {
    if (!workspace.currentWorkspace?.id) return

    try {
      await deleteChatRoom({
        id: chatRoom.id,
        workspaceId: workspace.currentWorkspace.id,
      }).unwrap()
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Failed to delete chat room:', error)
    }
  }

  const handleNotificationToggle = async () => {
    if (!workspace.currentWorkspace?.id) return

    try {
      await updateChatRoom({
        id: chatRoom.id,
        workspaceId: workspace.currentWorkspace.id,
        settings: {
          ...chatRoom.settings,
          notifications: !chatRoom.settings?.notifications,
        },
      }).unwrap()
    } catch (error) {
      console.error('Failed to toggle notifications:', error)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background/50 backdrop-blur">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={onMobileMenuClick}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Chat room avatar/icon */}
        <div className="relative">
          {chatRoom.type === 'direct' ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback>
                {getChatRoomInitials(chatRoom.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
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

        {/* Chat room info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate">
              {chatRoom.name}
            </h1>

            {/* Chat room type badge */}
            {chatRoom.type !== 'general' && (
              <Badge variant="outline" className="text-xs">
                {chatRoom.type}
              </Badge>
            )}

            {/* Archived badge */}
            {chatRoom.isArchived && (
              <Badge variant="secondary" className="text-xs">
                Archived
              </Badge>
            )}
          </div>

          {/* Description or participant count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {chatRoom.description ? (
              <span className="truncate">{chatRoom.description}</span>
            ) : (
              <span>
                {getParticipantCount()} member{getParticipantCount() !== 1 ? 's' : ''}
              </span>
            )}

            {/* Notification status */}
            {chatRoom.settings?.notifications === false && (
              <VolumeX className="h-3 w-3" />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Quick actions for larger screens */}
        <div className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailsDialogOpen(true)}>
            <Info className="h-4 w-4" />
          </Button>

          {chatRoom.type !== 'direct' && (
            <Button variant="ghost" size="sm" onClick={() => setAddParticipantsDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={handleNotificationToggle}>
            {chatRoom.settings?.notifications !== false ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setDetailsDialogOpen(true)}>
              <Info className="mr-2 h-4 w-4" />
              Chat details
            </DropdownMenuItem>

            {chatRoom.type !== 'direct' && (
              <>
                <DropdownMenuItem onClick={() => setAddParticipantsDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add members
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Chat settings
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleNotificationToggle}>
              {chatRoom.settings?.notifications !== false ? (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Mute notifications
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Unmute notifications
                </>
              )}
            </DropdownMenuItem>

            {!chatRoom.isArchived ? (
              <DropdownMenuItem onClick={handleArchiveToggle}>
                <Archive className="mr-2 h-4 w-4" />
                Archive chat
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleArchiveToggle}>
                <Archive className="mr-2 h-4 w-4" />
                Unarchive chat
              </DropdownMenuItem>
            )}

            {chatRoom.type !== 'general' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete chat
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chatRoom.name}"? This action cannot be undone and all messages will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat Details Dialog */}
      <ChatDetailsDialog
        chatRoom={chatRoom}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      {/* Add Participants Dialog */}
      <AddParticipantsDialog
        chatRoom={chatRoom}
        open={addParticipantsDialogOpen}
        onOpenChange={setAddParticipantsDialogOpen}
      />

      {/* Chat Settings Dialog */}
      <ChatSettingsDialog
        chatRoom={chatRoom}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  )
}