'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { useCreateChatRoomMutation } from '@/lib/api/chatApi'
import { useGetWorkspaceMembersQuery } from '@/lib/api/mongoApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Search } from 'lucide-react'

interface StartDirectChatDialogProps {
  trigger?: React.ReactNode
  onChatStarted?: (chatRoomId: string) => void
}

export const StartDirectChatDialog: React.FC<StartDirectChatDialogProps> = ({
  trigger,
  onChatStarted
}) => {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const workspace = useSelector((state: RootState) => state.workspace)
  const auth = useSelector((state: RootState) => state.auth)

  const [createChatRoom, { isLoading }] = useCreateChatRoomMutation()
  const { data: membersData } = useGetWorkspaceMembersQuery(
    workspace.currentWorkspace?.id || '',
    { skip: !workspace.currentWorkspace?.id }
  )

  const members = membersData?.members || []
  const filteredMembers = members.filter(member =>
    (member.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     member.user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    member.userId !== auth.user?.id // Exclude current user
  )

  const handleStartDirectChat = async (member: any) => {
    if (!workspace.currentWorkspace?.id) return

    try {
      // Create a direct chat room name using both user names
      const chatName = `${auth.user?.fullName || 'You'} & ${member.user.fullName}`

      const result = await createChatRoom({
        name: chatName,
        description: `Direct message between ${auth.user?.fullName || 'You'} and ${member.user.fullName}`,
        type: 'direct',
        participants: [member.userId],
        workspaceId: workspace.currentWorkspace.id,
      }).unwrap()

      setOpen(false)
      setSearchQuery('')

      if (onChatStarted && result.chatRoom) {
        onChatStarted(result.chatRoom.id)
      }
    } catch (error) {
      console.error('Failed to start direct chat:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Start Chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Direct Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspace members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-64 border rounded-md">
            <div className="p-2 space-y-1">
              {filteredMembers.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => handleStartDirectChat(member)}
                  disabled={isLoading}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-accent rounded-md transition-colors text-left disabled:opacity-50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {member.user.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.user.email}
                    </p>
                  </div>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

              {filteredMembers.length === 0 && searchQuery && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No members found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}

              {filteredMembers.length === 0 && !searchQuery && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Start typing to search for workspace members
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}