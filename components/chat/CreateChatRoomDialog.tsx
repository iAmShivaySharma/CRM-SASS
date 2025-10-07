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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Users, Hash, Lock } from 'lucide-react'

interface CreateChatRoomDialogProps {
  trigger?: React.ReactNode
}

export const CreateChatRoomDialog: React.FC<CreateChatRoomDialogProps> = ({
  trigger,
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'general' | 'private' | 'direct'>('general')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const workspace = useSelector((state: RootState) => state.workspace)
  const auth = useSelector((state: RootState) => state.auth)

  const [createChatRoom, { isLoading }] = useCreateChatRoomMutation()
  const { data: membersData } = useGetWorkspaceMembersQuery(
    workspace.currentWorkspace?.id || '',
    { skip: !workspace.currentWorkspace?.id }
  )

  const members = membersData?.members || []
  const filteredMembers = members
    .filter(
      member =>
        member.user.fullName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(member => member.userId !== auth.user?.id) // Exclude current user

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !workspace.currentWorkspace?.id) return

    try {
      await createChatRoom({
        name: name.trim(),
        description: description.trim(),
        type,
        participants: selectedMembers,
        workspaceId: workspace.currentWorkspace.id,
      }).unwrap()

      // Reset form
      setName('')
      setDescription('')
      setType('general')
      setSelectedMembers([])
      setSearchQuery('')
      setOpen(false)
    } catch (error) {
      console.error('Failed to create chat room:', error)
    }
  }

  const getRoomTypeIcon = (roomType: string) => {
    switch (roomType) {
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'direct':
        return <Users className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Chat Room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter room name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter room description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Room Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    General - Open to all workspace members
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private - Invite only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'private' && (
            <div className="space-y-2">
              <Label>Invite Members</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-48 rounded-md border p-2">
                  <div className="space-y-2">
                    {filteredMembers.map(member => (
                      <div
                        key={member.userId}
                        className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent"
                      >
                        <Checkbox
                          id={member.userId}
                          checked={selectedMembers.includes(member.userId)}
                          onCheckedChange={() =>
                            handleMemberToggle(member.userId)
                          }
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {member.user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {member.user.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredMembers.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No members found
                      </p>
                    )}
                  </div>
                </ScrollArea>
                {selectedMembers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedMembers.length} member(s) selected
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
