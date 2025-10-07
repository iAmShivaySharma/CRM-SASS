/**
 * Enhanced Workspace Settings Page
 *
 * Features:
 * - Tabbed interface for different settings sections
 * - General workspace settings (name, description, etc.)
 * - Member management with role assignments
 * - Workspace deletion and advanced settings
 * - Real-time updates and validation
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'
import {
  useGetWorkspaceQuery,
  useGetWorkspaceRolesQuery,
  useInviteToWorkspaceMutation,
  useUpdateWorkspaceMutation,
} from '@/lib/api/mongoApi'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building,
  Users,
  Settings,
  Shield,
  Crown,
  UserPlus,
  MoreHorizontal,
  Mail,
  Trash2,
  Edit,
  Copy,
  Check,
  Save,
  AlertTriangle,
  Plus,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'
import {
  CardSkeleton,
  PageHeaderSkeleton,
  ListItemSkeleton,
} from '@/components/ui/skeleton'
import { RoleForm } from '@/components/roles/RoleForm'
import { PermissionForm } from '@/components/permissions/PermissionForm'
import { useGetPermissionsQuery } from '@/lib/api/roleApi'

// Types for API responses
interface WorkspaceMember {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  role: string
  status: 'active' | 'pending'
  joinedAt: string
}

interface WorkspaceRole {
  id: string
  name: string
  description?: string
  permissions: string[]
  isDefault: boolean
  memberCount: number
  createdAt: string
  updatedAt: string
}

interface WorkspaceDetails {
  id: string
  name: string
  description?: string
  slug?: string
  planId: string
  memberCount: number
  userRole: string
  members: WorkspaceMember[]
}

export default function WorkspaceSettingsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState('general')
  const { customTheme } = useTheme()

  // RTK Query hooks
  const { data: workspaceData, isLoading: workspaceLoading } =
    useGetWorkspaceQuery(currentWorkspace?.id || '', {
      skip: !currentWorkspace?.id,
    })
  const { data: rolesData, isLoading: rolesLoading } =
    useGetWorkspaceRolesQuery(currentWorkspace?.id || '', {
      skip: !currentWorkspace?.id,
    })
  const { data: permissionsData, isLoading: permissionsLoading } =
    useGetPermissionsQuery(currentWorkspace?.id)
  const [inviteToWorkspace, { isLoading: inviteLoading }] =
    useInviteToWorkspaceMutation()
  const [updateWorkspace, { isLoading: updateLoading }] =
    useUpdateWorkspaceMutation()

  // Local state for form inputs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')

  // Role and Permission dialogs
  const [createRoleOpen, setCreateRoleOpen] = useState(false)
  const [createPermissionOpen, setCreatePermissionOpen] = useState(false)

  // Extract data from RTK Query responses
  const workspaceDetails = workspaceData?.workspace
  const members = workspaceDetails?.members || []
  const roles = useMemo(() => rolesData?.roles || [], [rolesData?.roles])
  const permissions = useMemo(() => permissionsData || [], [permissionsData])
  const memberCount = workspaceDetails?.memberCount || 0
  const isOwner = workspaceDetails?.userRole === 'Owner'

  // Group permissions by category for display
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, typeof permissions> = {}
    permissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = []
      }
      grouped[permission.category].push(permission)
    })
    return grouped
  }, [permissions])

  // General settings state
  const [workspaceName, setWorkspaceName] = useState(
    currentWorkspace?.name || ''
  )
  const [workspaceDescription, setWorkspaceDescription] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')

  // Update form state when workspace data loads
  useEffect(() => {
    if (workspaceDetails) {
      setWorkspaceName(workspaceDetails.name)
      setWorkspaceDescription(workspaceDetails.description || '')
      setWorkspaceSlug(workspaceDetails.slug || '')
    }
  }, [workspaceDetails])

  // Set default invite role when roles load
  useEffect(() => {
    if (roles && roles.length > 0 && !inviteRole) {
      setInviteRole(roles[0].id)
    }
  }, [roles, inviteRole])

  const handleSaveGeneral = async () => {
    if (!workspaceName.trim()) {
      toast.error('Workspace name is required')
      return
    }

    if (!currentWorkspace?.id) {
      toast.error('Workspace not found')
      return
    }

    try {
      const result = await updateWorkspace({
        id: currentWorkspace.id,
        name: workspaceName,
        description: workspaceDescription,
        slug: workspaceSlug,
      }).unwrap()

      if (result.success) {
        // Update Redux state with new workspace data
        if (currentWorkspace) {
          dispatch(
            setCurrentWorkspace({
              ...currentWorkspace,
              name: workspaceName,
              // Add other updated fields if needed
            })
          )
        }
        toast.success('Workspace settings updated successfully')
      }
    } catch (error: any) {
      console.error('Error updating workspace:', error)
      toast.error(error?.data?.message || 'Failed to update workspace settings')
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email address is required')
      return
    }

    if (!inviteRole) {
      toast.error('Please select a role')
      return
    }

    if (!currentWorkspace?.id) {
      toast.error('Workspace not found')
      return
    }

    try {
      const result = await inviteToWorkspace({
        workspaceId: currentWorkspace.id,
        email: inviteEmail,
        roleId: inviteRole,
        message: `You've been invited to join ${currentWorkspace.name} workspace.`,
      }).unwrap()

      if (result.success) {
        toast.success(`Invitation sent to ${inviteEmail}`)
        setInviteEmail('')
        setInviteRole(roles.length > 0 ? roles[0].id : '')
        setInviteDialogOpen(false)
      }
    } catch (error: any) {
      console.error('Error inviting member:', error)
      toast.error(error?.data?.message || 'Failed to send invitation')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'admin':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/20'
      case 'manager':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      case 'sales':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800'
      case 'viewer':
        return 'bg-muted text-muted-foreground border-muted-foreground/20'
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20'
    }
  }

  const getRoleIconBg = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-primary/10'
      case 'admin':
        return 'bg-secondary/10'
      case 'manager':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'sales':
        return 'bg-orange-50 dark:bg-orange-900/20'
      default:
        return 'bg-muted'
    }
  }

  const getRoleIconColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'text-primary'
      case 'admin':
        return 'text-secondary-foreground'
      case 'manager':
        return 'text-green-600 dark:text-green-400'
      case 'sales':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-muted-foreground'
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Building className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground">
            No Workspace Selected
          </h3>
          <p className="text-muted-foreground">
            Please select a workspace to manage its settings.
          </p>
        </div>
      </div>
    )
  }

  if ((workspaceLoading || rolesLoading) && !workspaceDetails) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {currentWorkspace.name}
              </h1>
              <div className="mt-1 flex items-center space-x-3">
                <Badge variant="secondary" className="capitalize">
                  {currentWorkspace.plan || 'Free'} Plan
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-1 h-4 w-4" />
                  {memberCount} member{memberCount !== 1 ? 's' : ''}
                </div>
                {isOwner && (
                  <Badge
                    variant="outline"
                    className="border-primary text-primary"
                  >
                    <Crown className="mr-1 h-3 w-3" />
                    Owner
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <div className="flex-shrink-0 lg:w-64">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'general'
                  ? 'border-r-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Settings className="mr-3 h-4 w-4" />
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'members'
                  ? 'border-r-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Users className="mr-3 h-4 w-4" />
              Team Members
              <Badge variant="secondary" className="ml-auto">
                {memberCount}
              </Badge>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'roles'
                  ? 'border-r-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Shield className="mr-3 h-4 w-4" />
              Roles & Permissions
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'advanced'
                  ? 'border-r-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Settings className="mr-3 h-4 w-4" />
              Advanced
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="min-w-0 flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>Workspace Information</CardTitle>
                <CardDescription>
                  Update your workspace name, description, and basic settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace Name *</Label>
                    <Input
                      id="workspaceName"
                      value={workspaceName}
                      onChange={e => setWorkspaceName(e.target.value)}
                      placeholder="Enter workspace name"
                      disabled={updateLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workspaceSlug">Workspace URL</Label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
                        crm.app/
                      </span>
                      <Input
                        id="workspaceSlug"
                        value={workspaceSlug}
                        onChange={e => setWorkspaceSlug(e.target.value)}
                        className="rounded-l-none"
                        placeholder="workspace-url"
                        disabled={updateLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspaceDescription">Description</Label>
                  <Textarea
                    id="workspaceDescription"
                    value={workspaceDescription}
                    onChange={e => setWorkspaceDescription(e.target.value)}
                    placeholder="Describe your workspace..."
                    rows={3}
                    disabled={workspaceLoading}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveGeneral} disabled={updateLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members Management */}
          {activeTab === 'members' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members ({members.length})</CardTitle>
                    <CardDescription>
                      Manage your workspace members and their permissions.
                    </CardDescription>
                  </div>
                  <Dialog
                    open={inviteDialogOpen}
                    onOpenChange={setInviteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join your workspace
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter email address"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select
                            value={inviteRole}
                            onValueChange={setInviteRole}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setInviteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleInviteMember}
                          disabled={!inviteEmail || inviteLoading}
                        >
                          {inviteLoading ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback>
                            {member.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{member.name}</p>
                            {member.role === 'Owner' && (
                              <Crown className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Joined{' '}
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                        {member.role !== 'Owner' && isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Resend Invitation
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roles & Permissions */}
          {activeTab === 'roles' && (
            <Tabs defaultValue="roles" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="roles">Role Management</TabsTrigger>
                <TabsTrigger value="permissions">
                  Permission Management
                </TabsTrigger>
              </TabsList>

              {/* Roles Tab */}
              <TabsContent value="roles" className="space-y-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Roles Management</CardTitle>
                        <CardDescription>
                          Create and manage workspace roles.
                        </CardDescription>
                      </div>
                      <Dialog
                        open={createRoleOpen}
                        onOpenChange={setCreateRoleOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Create New Role</DialogTitle>
                            <DialogDescription>
                              Define a new role with specific permissions for
                              your workspace.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto">
                            <RoleForm
                              onSuccess={() => setCreateRoleOpen(false)}
                              onCancel={() => setCreateRoleOpen(false)}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {rolesLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex animate-pulse items-center space-x-4 rounded-lg border p-4"
                          >
                            <div className="h-10 w-10 rounded-lg bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                              <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                            </div>
                            <div className="h-6 w-20 rounded bg-gray-200"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {roles.length === 0 ? (
                          <div className="py-8 text-center">
                            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              No roles found
                            </p>
                            <p className="text-sm text-muted-foreground/70">
                              Create your first role to get started
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {roles.map(role => (
                              <div
                                key={role.id}
                                className="flex items-center justify-between rounded-lg border p-4"
                              >
                                <div className="flex items-center space-x-4">
                                  <div
                                    className={cn(
                                      'flex h-10 w-10 items-center justify-center rounded-lg',
                                      getRoleIconBg(role.name)
                                    )}
                                  >
                                    {role.name === 'Owner' ? (
                                      <Crown
                                        className={cn(
                                          'h-5 w-5',
                                          getRoleIconColor(role.name)
                                        )}
                                      />
                                    ) : role.name === 'Admin' ? (
                                      <Shield
                                        className={cn(
                                          'h-5 w-5',
                                          getRoleIconColor(role.name)
                                        )}
                                      />
                                    ) : (
                                      <User
                                        className={cn(
                                          'h-5 w-5',
                                          getRoleIconColor(role.name)
                                        )}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium">
                                        {role.name}
                                      </h4>
                                      {role.isDefault && (
                                        <Badge variant="secondary">
                                          Default
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {role.description ||
                                        `${role.permissions.length} permissions`}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70">
                                      {(role as any).memberCount || 0} member
                                      {((role as any).memberCount || 0) !== 1
                                        ? 's'
                                        : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={cn(getRoleColor(role.name))}
                                  >
                                    {role.permissions.length} Permission
                                    {role.permissions.length !== 1 ? 's' : ''}
                                  </Badge>
                                  {!role.isDefault && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Role
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Users className="mr-2 h-4 w-4" />
                                          View Members
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete Role
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissions" className="space-y-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Permission Management</CardTitle>
                        <CardDescription>
                          Create and manage custom permissions for your
                          workspace.
                        </CardDescription>
                      </div>
                      <Dialog
                        open={createPermissionOpen}
                        onOpenChange={setCreatePermissionOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Permission
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Create New Permission</DialogTitle>
                            <DialogDescription>
                              Define a new custom permission for your workspace.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto">
                            <PermissionForm
                              onSuccess={() => setCreatePermissionOpen(false)}
                              onCancel={() => setCreatePermissionOpen(false)}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {permissionsLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="mb-3 h-4 w-24 rounded bg-gray-200"></div>
                            <div className="grid grid-cols-2 gap-4">
                              {Array.from({ length: 6 }).map((_, j) => (
                                <div
                                  key={j}
                                  className="h-16 rounded bg-gray-200"
                                ></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : permissions.length === 0 ? (
                      <div className="py-8 text-center">
                        <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="mb-2 text-lg font-medium text-foreground">
                          No Permissions Found
                        </h3>
                        <p className="mb-4 text-muted-foreground">
                          Create custom permissions to fine-tune access control
                          in your workspace.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setCreatePermissionOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Your First Permission
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Permission Summary */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <Card className="p-4">
                            <div className="flex items-center">
                              <Shield className="h-8 w-8 text-blue-600" />
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Total Permissions
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {permissions.length}
                                </p>
                              </div>
                            </div>
                          </Card>
                          <Card className="p-4">
                            <div className="flex items-center">
                              <Shield className="h-8 w-8 text-green-600" />
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  System Permissions
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {
                                    permissions.filter(
                                      p => p.isSystemPermission
                                    ).length
                                  }
                                </p>
                              </div>
                            </div>
                          </Card>
                          <Card className="p-4">
                            <div className="flex items-center">
                              <Shield className="h-8 w-8 text-purple-600" />
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Custom Permissions
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {
                                    permissions.filter(
                                      p => !p.isSystemPermission
                                    ).length
                                  }
                                </p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Permissions by Category */}
                        <Tabs
                          defaultValue={Object.keys(permissionsByCategory)[0]}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-5">
                            {Object.keys(permissionsByCategory).map(
                              category => (
                                <TabsTrigger key={category} value={category}>
                                  {category}
                                </TabsTrigger>
                              )
                            )}
                          </TabsList>

                          {Object.entries(permissionsByCategory).map(
                            ([category, categoryPermissions]) => (
                              <TabsContent
                                key={category}
                                value={category}
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  {categoryPermissions.map(permission => (
                                    <Card
                                      key={permission.id}
                                      className="transition-shadow hover:shadow-md"
                                    >
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <Shield className="h-5 w-5 text-blue-600" />
                                            <CardTitle className="text-lg">
                                              {permission.name}
                                            </CardTitle>
                                          </div>
                                          <Badge
                                            variant={
                                              permission.isSystemPermission
                                                ? 'secondary'
                                                : 'default'
                                            }
                                          >
                                            {permission.isSystemPermission
                                              ? 'System'
                                              : 'Custom'}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {permission.description}
                                        </p>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Permission Name
                                            </span>
                                            <code className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800">
                                              {permission.id}
                                            </code>
                                          </div>

                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Resource
                                            </span>
                                            <Badge variant="outline">
                                              {permission.resource}
                                            </Badge>
                                          </div>

                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              Action
                                            </span>
                                            <Badge variant="outline">
                                              {permission.action}
                                            </Badge>
                                          </div>

                                          {permission.dependencies &&
                                            permission.dependencies.length >
                                              0 && (
                                              <div className="border-t pt-3">
                                                <div className="mb-2 flex items-center space-x-2">
                                                  <Shield className="h-4 w-4 text-blue-500" />
                                                  <p className="text-xs text-gray-500">
                                                    Dependencies:
                                                  </p>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {permission.dependencies.map(
                                                    (dep, index) => (
                                                      <Badge
                                                        key={index}
                                                        variant="outline"
                                                        className="text-xs"
                                                      >
                                                        {dep}
                                                      </Badge>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                          {permission.conflictsWith &&
                                            permission.conflictsWith.length >
                                              0 && (
                                              <div className="border-t pt-3">
                                                <div className="mb-2 flex items-center space-x-2">
                                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                  <p className="text-xs text-gray-500">
                                                    Conflicts with:
                                                  </p>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {permission.conflictsWith.map(
                                                    (conflict, index) => (
                                                      <Badge
                                                        key={index}
                                                        variant="outline"
                                                        className="text-xs text-orange-600"
                                                      >
                                                        {conflict}
                                                      </Badge>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </TabsContent>
                            )
                          )}
                        </Tabs>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions for this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                    <div>
                      <p className="font-medium text-destructive">
                        Delete Workspace
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this workspace and all its data. This
                        action cannot be undone.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled={!isOwner}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Workspace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
