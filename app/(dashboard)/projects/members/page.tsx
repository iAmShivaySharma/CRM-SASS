'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  UserPlus,
  Crown,
  Shield,
  User,
  MoreVertical,
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetProjectsQuery,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
} from '@/lib/api/projectsApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatsCardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function ProjectMembersPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Get available projects
  const { data: projectsData } = useGetProjectsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
    },
    {
      skip: !currentWorkspace?.id,
    }
  )

  // Get project members for the selected project
  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
  } = useGetProjectMembersQuery(
    {
      projectId: projectFilter,
    },
    {
      skip:
        !currentWorkspace?.id ||
        projectFilter === 'all' ||
        !projectFilter ||
        projectFilter === '',
    }
  )

  const [addProjectMember] = useAddProjectMemberMutation()
  const [removeProjectMember] = useRemoveProjectMemberMutation()

  const members = membersData?.members || []

  const handleRemoveMember = async (memberId: string) => {
    if (!projectFilter || projectFilter === 'all') {
      toast.error('Please select a specific project')
      return
    }

    try {
      await removeProjectMember({
        projectId: projectFilter,
        memberId: memberId,
      }).unwrap()

      toast.success('Member removed successfully')
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch =
      search === '' ||
      member.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(search.toLowerCase())

    const matchesRole =
      roleFilter === 'all' ||
      member.role?.name?.toLowerCase() === roleFilter.toLowerCase()

    return matchesSearch && matchesRole
  })

  if (!currentWorkspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Members</h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectFilter !== 'all' && projectFilter && (
            <Badge variant="outline" className="text-sm">
              {projectsData?.projects.find(p => p.id === projectFilter)?.name ||
                'Unknown Project'}
            </Badge>
          )}
          <Button disabled={projectFilter === 'all' || !projectFilter}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredMembers.filter(m => m.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsData?.projects.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredMembers.map(m => m.role?.name)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectsData?.projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Members List */}
      {membersLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : membersError ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-sm text-red-500">Error loading members</div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No members found</h3>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? 'Try adjusting your search terms'
                    : projectFilter === 'all'
                      ? 'Select a project to view its members'
                      : 'Invite members to get started'}
                </p>
              </div>
              {!search && projectFilter !== 'all' && projectFilter && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Members
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map(member => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
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
                        <h3 className="font-medium">
                          {member.user?.fullName || 'Unknown User'}
                        </h3>
                        {getRoleIcon(member.role?.name || '')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email || ''}
                      </p>
                      <div className="mt-1 flex items-center space-x-4">
                        <span className="text-xs text-muted-foreground">
                          Status: {member.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Role: {member.role?.name || 'No role'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge
                      variant="secondary"
                      className={getRoleColor(member.role?.name || '')}
                    >
                      {member.role?.name || 'No role'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Joined{' '}
                      {new Date(
                        member.joinedAt || member.createdAt
                      ).toLocaleDateString()}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Projects</DropdownMenuItem>
                        <DropdownMenuItem>View Tasks</DropdownMenuItem>
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleRemoveMember(member.id)}
                        >
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
    </div>
  )
}
