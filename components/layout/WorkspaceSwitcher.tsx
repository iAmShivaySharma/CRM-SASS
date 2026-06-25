'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Building,
  ChevronDown,
  Plus,
  Check,
  Loader2,
  Users,
  Settings,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkspaceSwitcherSkeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { updateUser } from '@/lib/slices/authSlice'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'
import {
  useGetUserWorkspacesQuery,
  useCreateWorkspaceMutation,
  type Workspace as ApiWorkspace,
} from '@/lib/api/mongoApi'
import { projectsApi } from '@/lib/api/projectsApi'
import {
  useGetLastActiveWorkspaceQuery,
  useUpdateLastActiveWorkspaceMutation,
} from '@/lib/api/workspaceApi'

const workspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name is too long')
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .trim(),
  description: z.string().max(200, 'Description is too long').optional(),
})

type WorkspaceFormData = z.infer<typeof workspaceSchema>

interface Workspace {
  id: string
  name: string
  slug: string
  planId: string
  subscriptionStatus: string
  createdAt: string
  memberCount?: number
}

interface WorkspaceSwitcherProps {
  className?: string
  showCreateButton?: boolean
  compact?: boolean
}

export function WorkspaceSwitcher({
  className = '',
  showCreateButton = true,
  compact = false,
}: WorkspaceSwitcherProps) {
  const [mounted, setMounted] = useState(false)
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { user } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()

  const {
    data: workspacesData,
    isLoading,
    refetch,
  } = useGetUserWorkspacesQuery(user?.id || '', {
    skip: !user?.id,
  })
  const [createWorkspace, { isLoading: isCreatingWorkspace }] =
    useCreateWorkspaceMutation()

  const { data: lastActiveWorkspaceData } = useGetLastActiveWorkspaceQuery(
    undefined,
    {
      skip: !user?.id,
    }
  )
  const [updateLastActiveWorkspace] = useUpdateLastActiveWorkspaceMutation()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const workspaces = useMemo(
    () => workspacesData?.workspaces || [],
    [workspacesData?.workspaces]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
  })

  useEffect(() => {
    if (
      lastActiveWorkspaceData?.lastActiveWorkspaceId &&
      lastActiveWorkspaceData?.workspace &&
      workspaces.length > 0
    ) {
      const workspace = lastActiveWorkspaceData.workspace
      const isValidWorkspace = workspaces.some(w => w.id === workspace.id)

      if (isValidWorkspace && workspace.id !== currentWorkspace?.id) {
        dispatch(
          setCurrentWorkspace({
            id: workspace.id,
            name: workspace.name,
            plan: 'free',
            memberCount: 1,
            currency: workspace.currency,
            timezone: workspace.timezone,
            settings: workspace.settings,
            createdAt: workspace.createdAt,
          })
        )
      }
    } else if (workspaces.length > 0 && !currentWorkspace) {
      const firstWorkspace = workspaces[0]
      dispatch(
        setCurrentWorkspace({
          id: firstWorkspace.id,
          name: firstWorkspace.name,
          plan: 'free',
          memberCount: 1,
          currency: firstWorkspace.currency,
          timezone: firstWorkspace.timezone,
          settings: firstWorkspace.settings,
          createdAt: firstWorkspace.createdAt,
        })
      )
      updateLastActiveWorkspace({ workspaceId: firstWorkspace.id })
    }
  }, [
    lastActiveWorkspaceData,
    workspaces,
    currentWorkspace,
    dispatch,
    updateLastActiveWorkspace,
  ])

  const handleWorkspaceSwitch = async (workspace: ApiWorkspace) => {
    if (workspace.id === currentWorkspace?.id) return

    try {
      setIsSwitching(true)

      dispatch(
        setCurrentWorkspace({
          id: workspace.id,
          name: workspace.name,
          plan: 'free',
          memberCount: 1,
          currency: workspace.currency,
          timezone: workspace.timezone,
          settings: workspace.settings,
          createdAt: workspace.createdAt,
        })
      )

      if (currentWorkspace?.id) {
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Task', id: `WORKSPACE_${currentWorkspace.id}` },
            { type: 'Project', id: 'LIST' },
            { type: 'Task', id: 'LIST' },
          ])
        )
      }

      await updateLastActiveWorkspace({ workspaceId: workspace.id }).unwrap()

      try {
        const permRes = await fetch(
          `/api/user/workspace-permissions?workspaceId=${workspace.id}`,
          { credentials: 'include' }
        )
        if (permRes.ok) {
          const permData = await permRes.json()
          dispatch(
            updateUser({
              role: permData.role,
              roleId: permData.roleId,
              permissions: permData.permissions,
              workspaceId: workspace.id,
            })
          )
        }
      } catch (permError) {
        console.error('Error loading workspace permissions:', permError)
      }

      toast.success(`Switched to ${workspace.name}`)
    } catch (error) {
      console.error('Error switching workspace:', error)
      toast.error('Failed to switch workspace')
    } finally {
      setIsSwitching(false)
    }
  }

  const onCreateWorkspace = async (data: WorkspaceFormData) => {
    try {
      const result = await createWorkspace({
        name: data.name.trim(),
        description: data.description?.trim() || '',
      }).unwrap()

      dispatch(
        setCurrentWorkspace({
          id: result.workspace.id,
          name: result.workspace.name,
          plan: 'free',
          memberCount: 1,
          currency: result.workspace.currency,
          timezone: result.workspace.timezone,
          settings: result.workspace.settings,
          createdAt: result.workspace.createdAt,
        })
      )

      await updateLastActiveWorkspace({
        workspaceId: result.workspace.id,
      }).unwrap()

      toast.success('Workspace created successfully!')
      setIsCreateDialogOpen(false)
      reset()
    } catch (error: any) {
      console.error('Workspace creation error:', error)
      const errorMessage =
        error?.data?.message || error?.message || 'Failed to create workspace'
      toast.error(errorMessage)
    }
  }

  if (!mounted || isLoading) {
    return <WorkspaceSwitcherSkeleton className={className} />
  }

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <div className={compact ? 'px-1 py-2' : 'px-3 py-2'}>
          {!compact && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Workspace
            </p>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full ${compact ? 'justify-center p-2' : 'h-auto justify-between p-2'} ${compact ? 'text-xs' : 'text-sm'}`}
                disabled={isSwitching}
                title={
                  compact
                    ? currentWorkspace?.name || 'Select Workspace'
                    : undefined
                }
              >
                {compact ? (
                  <div className="flex items-center justify-center">
                    {isSwitching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Building className="h-4 w-4" />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center space-x-2">
                      <Building className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0 text-left">
                        <p className="truncate font-medium">
                          {currentWorkspace?.name || 'Select Workspace'}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          Free Plan
                        </p>
                      </div>
                    </div>
                    {isSwitching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    )}
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {workspaces.map(workspace => (
                <DropdownMenuItem
                  key={workspace.id}
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => handleWorkspaceSwitch(workspace)}
                >
                  <div className="flex min-w-0 items-center space-x-2">
                    <Building className="h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{workspace.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        Free Plan • 1 member
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {workspace.id === currentWorkspace?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                        onClick={e => {
                          e.stopPropagation()
                          router.push('/workspace')
                        }}
                        title="Workspace Settings"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    )}
                    {workspace.id === currentWorkspace?.id && (
                      <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}

              {showCreateButton && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center space-x-2 text-blue-600"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create new workspace</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!compact && currentWorkspace && <div className="space-y-1 px-3"></div>}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Create New Workspace
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Set up a new workspace to organize your team, projects, and leads
              in one place.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onCreateWorkspace)}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-sm font-medium">
                  Workspace Name *
                </Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Acme Sales Team"
                  {...register('name')}
                  className={`h-11 ${errors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                  disabled={isCreatingWorkspace}
                />
                {errors.name && (
                  <p className="flex items-center space-x-1 text-sm text-red-600">
                    <span className="h-1 w-1 rounded-full bg-red-600"></span>
                    <span>{errors.name.message}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="workspace-description"
                  className="text-sm font-medium"
                >
                  Description <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="workspace-description"
                  placeholder="Brief description of your workspace"
                  {...register('description')}
                  className={`h-11 ${errors.description ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                  disabled={isCreatingWorkspace}
                />
                {errors.description && (
                  <p className="flex items-center space-x-1 text-sm text-red-600">
                    <span className="h-1 w-1 rounded-full bg-red-600"></span>
                    <span>{errors.description.message}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Your workspace will include:
              </h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Lead management and tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Team collaboration tools</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Analytics and reporting</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse space-y-2 space-y-reverse pt-2 sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  reset()
                }}
                disabled={isCreatingWorkspace}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingWorkspace}
                className="h-11 min-w-[140px] bg-blue-600 hover:bg-blue-700"
              >
                {isCreatingWorkspace ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Workspace</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
