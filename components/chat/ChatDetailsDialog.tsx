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
  Clock
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
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-start gap-4">
            <div className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-primary/10 text-primary"
            )}>
              {getChatRoomIcon(chatRoom.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle className="text-2xl font-bold">{chatRoom.name}</DialogTitle>
                <Badge variant="outline" className="text-xs font-medium">
                  {chatRoom.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {chatRoom.isArchived && (
                  <Badge variant="secondary" className="text-xs">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
                {chatRoom.settings?.notifications === false && (
                  <Badge variant="outline" className="text-xs">
                    <VolumeX className="h-3 w-3 mr-1" />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stats & Quick Info */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Members</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getParticipantCount()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 p-4 rounded-xl border border-green-200/50 dark:border-green-800/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Admins</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getAdminCount()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-muted/30 rounded-xl p-4 border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">{formatDate(chatRoom.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Last updated</p>
                      <p className="text-muted-foreground">{formatDate(chatRoom.updatedAt)}</p>
                    </div>
                  </div>
                  {chatRoom.lastMessage && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Last message</p>
                        <p className="text-muted-foreground">{formatDate(chatRoom.lastMessage.timestamp)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Settings & Participants */}
            <div className="lg:col-span-2 space-y-6">
              {/* Settings */}
              <div className="bg-muted/30 rounded-xl p-5 border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Chat Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <Hash className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium">File sharing</span>
                    </div>
                    <Badge variant={chatRoom.settings?.allowFileSharing ? "default" : "secondary"} className="text-xs">
                      {chatRoom.settings?.allowFileSharing ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-500/10 rounded">
                        <Settings className="h-3 w-3 text-orange-500" />
                      </div>
                      <span className="text-sm font-medium">Reactions</span>
                    </div>
                    <Badge variant={chatRoom.settings?.allowReactions ? "default" : "secondary"} className="text-xs">
                      {chatRoom.settings?.allowReactions ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 rounded">
                        {chatRoom.settings?.notifications !== false ? (
                          <Volume2 className="h-3 w-3 text-blue-500" />
                        ) : (
                          <VolumeX className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium">Notifications</span>
                    </div>
                    <Badge variant={chatRoom.settings?.notifications !== false ? "default" : "secondary"} className="text-xs">
                      {chatRoom.settings?.notifications !== false ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-500/10 rounded">
                        <Clock className="h-3 w-3 text-red-500" />
                      </div>
                      <span className="text-sm font-medium">Retention</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {chatRoom.settings?.retentionDays === -1 ? 'Forever' : `${chatRoom.settings?.retentionDays || 90} days`}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="bg-muted/30 rounded-xl p-5 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants ({getParticipantCount()})
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="grid gap-3">
                    {Array.isArray(chatRoom.participants) && chatRoom.participants.map((participant: any) => (
                      <div key={participant.id || participant._id} className="flex items-center gap-3 p-3 bg-background rounded-lg border hover:shadow-sm transition-shadow">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                            {participant.name ? participant.name.charAt(0).toUpperCase() : participant.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {participant.name || participant.email}
                          </p>
                          {participant.email && participant.name && (
                            <p className="text-sm text-muted-foreground truncate">
                              {participant.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {Array.isArray(chatRoom.admins) && chatRoom.admins.some((admin: any) =>
                            (admin.id || admin._id || admin) === (participant.id || participant._id)
                          ) && (
                            <Badge variant="default" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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