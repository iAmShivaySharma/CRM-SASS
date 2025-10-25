'use client'

import { useState } from 'react'
import { UserPlus, Search } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useGetWorkspaceMembersQuery } from '@/lib/api/mongoApi'
import { useAddProjectMemberMutation } from '@/lib/api/projectsApi'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  existingMemberIds: string[]
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  projectId,
  existingMemberIds,
}: InviteMemberDialogProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get workspace members
  const {
    data: membersData,
    isLoading: membersLoading,
  } = useGetWorkspaceMembersQuery(
    currentWorkspace?.id || '',
    { skip: !currentWorkspace?.id || !open }
  )


  const [addProjectMember] = useAddProjectMemberMutation()

  const availableMembers = (membersData?.members || []).filter(
    member =>
      member.status === 'active' &&
      !existingMemberIds.includes(member.user?.id || '') &&
      (search === '' ||
       member.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
       member.user?.email?.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedUser = availableMembers.find(m => m.user?.id === selectedUserId)

  const handleSubmit = async () => {
    if (!selectedUserId || !currentWorkspace || !selectedUser) {
      toast.error('Please select a user')
      return
    }

    setIsSubmitting(true)
    try {
      // Use the user's existing workspace roleId for the project
      await addProjectMember({
        projectId,
        userId: selectedUserId,
        roleId: selectedUser.roleId, // Use their workspace role
      }).unwrap()

      toast.success('Member invited successfully')
      onOpenChange(false)
      setSelectedUserId('')
      setSearch('')
    } catch (error) {
      console.error('Failed to invite member:', error)
      toast.error('Failed to invite member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedUserId('')
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Member to Project
          </DialogTitle>
          <DialogDescription>
            Select a workspace member to add to this project. Their existing workspace role will be used for project access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Available Members */}
          <div className="space-y-2">
            <Label>Available Members ({availableMembers.length})</Label>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading members...</div>
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      {search ? 'No members found matching your search' : 'No available members to invite'}
                    </div>
                  </div>
                </div>
              ) : (
                availableMembers.map(member => (
                  <Card
                    key={member.user?.id}
                    className={`cursor-pointer transition-colors ${
                      selectedUserId === member.user?.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedUserId(member.user?.id || '')}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={(member.user as any)?.avatarUrl || undefined} />
                            <AvatarFallback>
                              {member.user?.fullName
                                ?.split(' ')
                                .map(n => n[0])
                                .join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {member.user?.fullName || 'Unknown User'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.user?.email || 'No email'}
                            </div>
                          </div>
                        </div>
                        {selectedUserId === member.user?.id && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Selected User Summary */}
          {selectedUser && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(selectedUser.user as any)?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {selectedUser.user?.fullName
                          ?.split(' ')
                          .map(n => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {selectedUser.user?.fullName || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedUser.user?.email || 'No email'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    Workspace Member
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}