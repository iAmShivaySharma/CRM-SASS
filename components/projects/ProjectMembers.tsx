'use client'

import { useState } from 'react'
import { Plus, UserPlus, Crown, Shield, User, MoreVertical, MessageSquare, UserMinus } from 'lucide-react'
import { useRemoveProjectMemberMutation } from '@/lib/api/projectsApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CardSkeleton } from '@/components/ui/skeleton'
import { InviteMemberDialog } from './InviteMemberDialog'
import { toast } from 'sonner'
import type { ProjectMember } from '@/lib/api/projectsApi'

interface ProjectMembersProps {
  projectId: string
  members: ProjectMember[]
  isLoading: boolean
}

export function ProjectMembers({ projectId, members, isLoading }: ProjectMembersProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [removeProjectMember] = useRemoveProjectMemberMutation()

  const existingMemberIds = members.map(member => member.userId).filter(Boolean)

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return
    }

    try {
      await removeProjectMember({
        projectId,
        memberId,
      }).unwrap()
      toast.success(`${memberName} removed from project`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const handleChangeRole = (member: ProjectMember) => {
    // For now, show a message that role changes should be done at workspace level
    toast.info('To change roles, update their workspace role in Settings > Members')
  }

  const handleSendMessage = (member: ProjectMember) => {
    // This could integrate with a chat system
    toast.info('Direct messaging feature coming soon!')
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin':
      case 'administrator':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'admin':
      case 'administrator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Project Members</h2>
            <p className="text-muted-foreground">
              Manage who has access to this project
            </p>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        </div>

        <div className="grid gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Project Members</h2>
          <p className="text-muted-foreground">
            Manage who has access to this project
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No members yet</h3>
                <p className="text-sm text-muted-foreground">
                  Invite team members to start collaborating on this project
                </p>
              </div>
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Members
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {members.map(member => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {member.user?.fullName
                          ?.split(' ')
                          .map(n => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{member.user?.fullName || 'Unknown User'}</h3>
                        {getRoleIcon(member.role?.name || 'member')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email || 'No email'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge
                      variant="secondary"
                      className={getRoleColor(member.role?.name || 'member')}
                    >
                      {member.role?.name || 'Member'}
                    </Badge>
                    {member.status && (
                      <Badge
                        variant={member.status === 'active' ? 'default' : 'secondary'}
                        className={
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }
                      >
                        {member.status}
                      </Badge>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown'}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendMessage(member)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleRemoveMember(member.id, member.user?.fullName || 'User')}
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove from Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        projectId={projectId}
        existingMemberIds={existingMemberIds}
      />
    </div>
  )
}
