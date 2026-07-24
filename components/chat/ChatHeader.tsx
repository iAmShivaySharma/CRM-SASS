'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Menu,
  Hash,
  Lock,
  Users,
  MoreVertical,
  Loader2,
  UserPlus,
  Settings,
  Archive,
  Trash2,
  Volume2,
  VolumeX,
  Info,
  Phone,
  Video,
  CalendarPlus,
} from 'lucide-react'
import { type RootState } from '@/lib/store'
import {
  type ChatRoom,
  useUpdateChatRoomMutation,
  useDeleteChatRoomMutation,
} from '@/lib/api/chatApi'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { ChatSettingsDialog } from './ChatSettingsDialog'
import { AddParticipantsDialog } from './AddParticipantsDialog'
import { ChatDetailsDialog } from './ChatDetailsDialog'

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
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingCreating, setMeetingCreating] = useState(false)
  const [addParticipantsDialogOpen, setAddParticipantsDialogOpen] =
    useState(false)
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

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!workspace.currentWorkspace?.id) return
    setIsDeleting(true)
    try {
      await deleteChatRoom({
        id: chatRoom.id,
        workspaceId: workspace.currentWorkspace.id,
      }).unwrap()
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Failed to delete chat room:', error)
    } finally {
      setIsDeleting(false)
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
    <div className="flex items-center justify-between border-b bg-background/50 p-4 backdrop-blur">
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
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                'bg-primary/10 text-primary'
              )}
            >
              {getChatRoomIcon(chatRoom.type)}
            </div>
          )}

          {/* Online indicator for direct messages */}
          {chatRoom.type === 'direct' && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
          )}
        </div>

        {/* Chat room info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{chatRoom.name}</h1>

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
                {getParticipantCount()} member
                {getParticipantCount() !== 1 ? 's' : ''}
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
        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                const workspace = (window as any).__WORKSPACE_ID
                const res = await fetch('/api/meetings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    workspaceId: workspace || '',
                    chatRoomId: chatRoom.id,
                    title: `Voice call in ${chatRoom.name}`,
                    type: 'voice',
                  }),
                })
                const data = await res.json()
                if (data.success) {
                  const { socket } = (await import(
                    '@/lib/context/SocketContext'
                  ).then(() => ({}))) as any
                }
              } catch {}
            }}
            title="Voice call"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                const workspace = (window as any).__WORKSPACE_ID
                await fetch('/api/meetings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    workspaceId: workspace || '',
                    chatRoomId: chatRoom.id,
                    title: `Video call in ${chatRoom.name}`,
                    type: 'video',
                  }),
                })
              } catch {}
            }}
            title="Video call"
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScheduleMeetingOpen(true)}
            title="Schedule meeting"
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetailsDialogOpen(true)}
          >
            <Info className="h-4 w-4" />
          </Button>

          {chatRoom.type !== 'direct' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddParticipantsDialogOpen(true)}
            >
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
                <DropdownMenuItem
                  onClick={() => setAddParticipantsDialogOpen(true)}
                >
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
              Are you sure you want to delete &quot;{chatRoom.name}&quot;? This
              action cannot be undone and all messages will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

      <Dialog open={scheduleMeetingOpen} onOpenChange={setScheduleMeetingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                placeholder="Meeting title"
              />
            </div>
            <div className="space-y-1">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleMeetingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={meetingCreating || !meetingTitle || !meetingDate}
              onClick={async () => {
                setMeetingCreating(true)
                try {
                  const res = await fetch('/api/meetings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      workspaceId:
                        chatRoom.workspaceId ||
                        (window as any).__WORKSPACE_ID ||
                        '',
                      chatRoomId: chatRoom.id,
                      title: meetingTitle,
                      type: 'scheduled',
                      scheduledAt: new Date(meetingDate).toISOString(),
                      participantIds: chatRoom.participants || [],
                    }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    toast.success('Meeting scheduled')
                    setScheduleMeetingOpen(false)
                    setMeetingTitle('')
                    setMeetingDate('')

                    await fetch(`/api/meetings/${data.meeting.id}/invite`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userIds: chatRoom.participants || [],
                      }),
                    }).catch(() => {})
                  } else {
                    toast.error(data.message || 'Failed to schedule')
                  }
                } catch {
                  toast.error('Failed to schedule meeting')
                } finally {
                  setMeetingCreating(false)
                }
              }}
            >
              {meetingCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="mr-2 h-4 w-4" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
