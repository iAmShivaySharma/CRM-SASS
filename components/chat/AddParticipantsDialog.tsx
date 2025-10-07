'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { ChatRoom, useUpdateChatRoomMutation } from '@/lib/api/chatApi'
import { useGetWorkspaceMembersQuery } from '@/lib/api/mongoApi'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, UserPlus, Loader2 } from 'lucide-react'

interface AddParticipantsDialogProps {
  chatRoom: ChatRoom
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddParticipantsDialog: React.FC<AddParticipantsDialogProps> = ({
  chatRoom,
  open,
  onOpenChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const workspace = useSelector((state: RootState) => state.workspace)
  const [updateChatRoom] = useUpdateChatRoomMutation()

  const { data: workspaceMembersData, isLoading } = useGetWorkspaceMembersQuery(
    workspace.currentWorkspace?.id || '',
    { skip: !workspace.currentWorkspace?.id || !open }
  )

  const workspaceMembers = workspaceMembersData?.members || []

  // Filter out existing participants and search by name/email
  const availableMembers = workspaceMembers.filter(member => {
    const isAlreadyParticipant =
      Array.isArray(chatRoom.participants) &&
      chatRoom.participants.some(
        (p: any) =>
          (p.id || p._id || p) ===
          ((member.userId as any)?.id ||
            (member.userId as any)?._id ||
            member.userId)
      )

    if (isAlreadyParticipant) return false

    if (!searchQuery) return true

    const memberName =
      (member.userId as any)?.name || (member.userId as any)?.email || ''
    const memberEmail = (member.userId as any)?.email || ''

    return (
      memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memberEmail.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleAddParticipants = async () => {
    if (selectedMembers.length === 0 || !workspace.currentWorkspace?.id) return

    setIsAdding(true)
    try {
      const currentParticipants = Array.isArray(chatRoom.participants)
        ? chatRoom.participants.map((p: any) => p.id || p._id || p)
        : []

      await updateChatRoom({
        id: chatRoom.id,
        workspaceId: workspace.currentWorkspace.id,
        participants: [...currentParticipants, ...selectedMembers],
      }).unwrap()

      setSelectedMembers([])
      setSearchQuery('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add participants:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleClose = () => {
    setSelectedMembers([])
    setSearchQuery('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Participants
          </DialogTitle>
          <DialogDescription>
            Add workspace members to &quot;{chatRoom.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading members...
                </span>
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No members found matching your search.'
                    : 'All workspace members are already participants.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableMembers.map(member => {
                  const memberId =
                    (member.userId as any)?.id ||
                    (member.userId as any)?._id ||
                    member.userId
                  const memberName =
                    (member.userId as any)?.name ||
                    (member.userId as any)?.email ||
                    'Unknown'
                  const memberEmail = (member.userId as any)?.email
                  const isSelected = selectedMembers.includes(memberId)

                  return (
                    <div
                      key={memberId}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-muted/50',
                        isSelected && 'bg-primary/10'
                      )}
                      onClick={() => handleMemberToggle(memberId)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleMemberToggle(memberId)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(member.userId as any)?.avatar} />
                        <AvatarFallback>
                          {memberName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {memberName}
                        </p>
                        {memberEmail && memberName !== memberEmail && (
                          <p className="truncate text-xs text-muted-foreground">
                            {memberEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {selectedMembers.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedMembers.length} member
              {selectedMembers.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddParticipants}
            disabled={selectedMembers.length === 0 || isAdding}
          >
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {selectedMembers.length > 0 ? `${selectedMembers.length} ` : ''}
            Member{selectedMembers.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
