'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

const JAAS_APP_ID = 'vpaas-magic-cookie-bd1c173591be4119889c472ab01f8874'

function JaaSMeeting({
  appId,
  roomName,
  chatName,
  callType,
  onEnd,
}: {
  appId: string
  roomName: string
  chatName: string
  callType: 'video' | 'voice'
  onEnd: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    const scriptId = 'jaas-external-api'
    const scriptSrc = `https://8x8.vc/${appId}/external_api.js`

    const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const oldScript = document.getElementById('jitsi-script')
        if (oldScript) {
          oldScript.remove()
        }

        const existing = document.getElementById(scriptId)
        if (existing && existing.getAttribute('src') === scriptSrc) {
          if ((window as any).JitsiMeetExternalAPI) {
            resolve()
            return
          }
          existing.addEventListener('load', () => resolve(), { once: true })
          return
        }

        if (existing) {
          existing.remove()
        }
        ;(window as any).JitsiMeetExternalAPI = undefined

        const s = document.createElement('script')
        s.id = scriptId
        s.src = scriptSrc
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Failed to load JaaS script'))
        document.head.appendChild(s)
      })
    }

    const init = async () => {
      try {
        await loadScript()
        if (cancelled || !containerRef.current) {
          return
        }

        apiRef.current = new (window as any).JitsiMeetExternalAPI('8x8.vc', {
          roomName: `${appId}/${roomName}`,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: callType === 'voice',
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            hideConferenceSubject: true,
            enableWelcomePage: false,
            enableClosePage: false,
            toolbarButtons: [
              'microphone',
              'camera',
              'hangup',
              'chat',
              'participants-pane',
              'raisehand',
              'tileview',
              'desktop',
              'settings',
              'fullscreen',
              'select-background',
              'shareaudio',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            MOBILE_APP_PROMO: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          },
          userInfo: {
            displayName: chatName,
          },
        })

        apiRef.current.addListener('readyToClose', () => {
          if (!cancelled) {
            onEnd()
          }
        })
      } catch {
        // fallback ignored
      }
    }

    init()

    return () => {
      cancelled = true
      if (apiRef.current) {
        try {
          apiRef.current.dispose()
        } catch {}
        apiRef.current = null
      }
    }
  }, [appId, roomName, chatName, callType, onEnd])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

function CallPanel({
  callType,
  roomName,
  chatName,
  onEnd,
}: {
  callType: 'video' | 'voice'
  roomName: string
  chatName: string
  onEnd: () => void
}) {
  const [maximized, setMaximized] = useState(true)

  const content = (
    <div
      style={
        maximized
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              background: '#000',
            }
          : {
              flex: '1 1 0%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }
      }
    >
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {callType === 'video' ? (
            <Video className="h-4 w-4 text-primary" />
          ) : (
            <Phone className="h-4 w-4 text-primary" />
          )}
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            CRM Meet — {chatName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setMaximized(prev => !prev)}
            title={maximized ? 'Minimize' : 'Maximize'}
          >
            {maximized ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onEnd}
          >
            End
          </Button>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          flex: '1 1 0%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <JaaSMeeting
            appId={JAAS_APP_ID}
            roomName={roomName}
            chatName={chatName}
            callType={callType}
            onEnd={onEnd}
          />
        </div>
      </div>
    </div>
  )

  if (maximized) {
    return createPortal(content, document.body)
  }
  return content
}

export { CallPanel }

interface ChatHeaderProps {
  chatRoom: ChatRoom
  onMobileMenuClick: () => void
  onCallChange?: (
    call: { type: 'video' | 'voice'; roomId: string } | null
  ) => void
}

function getChatRoomIcon(type: ChatRoom['type']) {
  switch (type) {
    case 'private':
      return <Lock className="h-4 w-4" />
    case 'direct':
      return <Users className="h-4 w-4" />
    default:
      return <Hash className="h-4 w-4" />
  }
}

function getChatRoomInitials(name: string) {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatRoom,
  onMobileMenuClick,
  onCallChange,
}) => {
  const [callType, setCallType] = useState<'video' | 'voice' | null>(null)
  const callRoomIdRef = useRef<string | null>(null)

  const startCall = (type: 'video' | 'voice') => {
    const roomId = `crm-${chatRoom.id}-${Date.now()}`
    callRoomIdRef.current = roomId
    setCallType(type)
    onCallChange?.({ type, roomId })
  }

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

  const [updateChatRoom, { isLoading: isUpdatingRoom }] =
    useUpdateChatRoomMutation()
  const [deleteChatRoom] = useDeleteChatRoomMutation()

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
            onClick={() => startCall('video')}
            title="Start meeting"
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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNotificationToggle}
            disabled={isUpdatingRoom}
          >
            {isUpdatingRoom ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : chatRoom.settings?.notifications !== false ? (
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

            <DropdownMenuItem
              disabled={isUpdatingRoom}
              onClick={handleNotificationToggle}
            >
              {chatRoom.settings?.notifications !== false ? (
                <>
                  {isUpdatingRoom ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <VolumeX className="mr-2 h-4 w-4" />
                  )}
                  Mute notifications
                </>
              ) : (
                <>
                  {isUpdatingRoom ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="mr-2 h-4 w-4" />
                  )}
                  Unmute notifications
                </>
              )}
            </DropdownMenuItem>

            {!chatRoom.isArchived ? (
              <DropdownMenuItem
                disabled={isUpdatingRoom}
                onClick={handleArchiveToggle}
              >
                {isUpdatingRoom ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                Archive chat
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={isUpdatingRoom}
                onClick={handleArchiveToggle}
              >
                {isUpdatingRoom ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
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

      {/* CallPanel is rendered by ChatInterface, not here */}

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
