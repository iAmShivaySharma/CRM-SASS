'use client'

import React from 'react'
import { ChatRoom } from '@/lib/api/chatApi'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Hash,
  Lock,
  Users,
  Calendar,
  User,
  Settings,
  Volume2,
  VolumeX,
  Archive,
  Clock,
} from 'lucide-react'

interface ChatDetailsDialogProps {
  chatRoom: ChatRoom
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ChatDetailsDialog: React.FC<ChatDetailsDialogProps> = ({
  chatRoom,
  open,
  onOpenChange,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getParticipantCount = () => {
    if (Array.isArray(chatRoom.participants)) {
      return chatRoom.participants.length
    }
    return 0
  }

  const getAdminCount = () => {
    if (Array.isArray(chatRoom.admins)) {
      return chatRoom.admins.length
    }
    return 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl p-0">
        {/* Header */}
        <div className="border-b p-6 pb-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl',
                'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
              )}
            >
              {getChatRoomIcon(chatRoom.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <DialogTitle className="text-2xl font-bold">
                  {chatRoom.name}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-medium">
                  {chatRoom.type}
                </Badge>
              </div>
              <div className="mb-3 flex items-center gap-2">
                {chatRoom.isArchived && (
                  <Badge variant="secondary" className="text-xs">
                    <Archive className="mr-1 h-3 w-3" />
                    Archived
                  </Badge>
                )}
                {chatRoom.settings?.notifications === false && (
                  <Badge variant="outline" className="text-xs">
                    <VolumeX className="mr-1 h-3 w-3" />
                    Muted
                  </Badge>
                )}
              </div>
              {chatRoom.description && (
                <DialogDescription className="text-base">
                  {chatRoom.description}
                </DialogDescription>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column - Stats & Quick Info */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:border-blue-800/30 dark:from-blue-950/30 dark:to-blue-900/20">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Members
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {getParticipantCount()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-green-200/50 bg-gradient-to-br from-green-50 to-green-100 p-4 dark:border-green-800/30 dark:from-green-950/30 dark:to-green-900/20">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/10 p-2">
                      <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Admins
                      </p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {getAdminCount()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <div className="flex-1">
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">
                        {formatDate(chatRoom.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                    <div className="flex-1">
                      <p className="font-medium">Last updated</p>
                      <p className="text-muted-foreground">
                        {formatDate(chatRoom.updatedAt)}
                      </p>
                    </div>
                  </div>
                  {chatRoom.lastMessage && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <p className="font-medium">Last message</p>
                        <p className="text-muted-foreground">
                          {formatDate(chatRoom.lastMessage.timestamp)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Settings & Participants */}
            <div className="space-y-6 lg:col-span-2">
              {/* Settings */}
              <div className="rounded-xl border bg-muted/30 p-5">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Settings className="h-5 w-5" />
                  Chat Settings
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-primary/10 p-1.5">
                        <Hash className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium">File sharing</span>
                    </div>
                    <Badge
                      variant={
                        chatRoom.settings?.allowFileSharing
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {chatRoom.settings?.allowFileSharing
                        ? 'Enabled'
                        : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-orange-500/10 p-1.5">
                        <Settings className="h-3 w-3 text-orange-500" />
                      </div>
                      <span className="text-sm font-medium">Reactions</span>
                    </div>
                    <Badge
                      variant={
                        chatRoom.settings?.allowReactions
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {chatRoom.settings?.allowReactions
                        ? 'Enabled'
                        : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-blue-500/10 p-1.5">
                        {chatRoom.settings?.notifications !== false ? (
                          <Volume2 className="h-3 w-3 text-blue-500" />
                        ) : (
                          <VolumeX className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium">Notifications</span>
                    </div>
                    <Badge
                      variant={
                        chatRoom.settings?.notifications !== false
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {chatRoom.settings?.notifications !== false
                        ? 'Enabled'
                        : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-red-500/10 p-1.5">
                        <Clock className="h-3 w-3 text-red-500" />
                      </div>
                      <span className="text-sm font-medium">Retention</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {chatRoom.settings?.retentionDays === -1
                        ? 'Forever'
                        : `${chatRoom.settings?.retentionDays || 90} days`}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Users className="h-5 w-5" />
                    Participants ({getParticipantCount()})
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="grid gap-3">
                    {Array.isArray(chatRoom.participants) &&
                      chatRoom.participants.map((participant: any) => (
                        <div
                          key={participant.id || participant._id}
                          className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-shadow hover:shadow-sm"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 font-semibold text-primary">
                              {participant.name
                                ? participant.name.charAt(0).toUpperCase()
                                : participant.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {participant.name || participant.email}
                            </p>
                            {participant.email && participant.name && (
                              <p className="truncate text-sm text-muted-foreground">
                                {participant.email}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {Array.isArray(chatRoom.admins) &&
                              chatRoom.admins.some(
                                (admin: any) =>
                                  (admin.id || admin._id || admin) ===
                                  (participant.id || participant._id)
                              ) && (
                                <Badge variant="default" className="text-xs">
                                  <User className="mr-1 h-3 w-3" />
                                  Admin
                                </Badge>
                              )}
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
