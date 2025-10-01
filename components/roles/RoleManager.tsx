'use client'

import { useState } from 'react'
import { Plus, Shield, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAppSelector } from '@/lib/hooks'
import { RoleForm } from './RoleForm'
import { toast } from 'sonner'
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'
import { useGetRolesQuery, useDeleteRoleMutation } from '@/lib/api/mongoApi'

export function RoleManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // RTK Query hooks
  const {
    data: rolesData,
    isLoading,
    refetch,
  } = useGetRolesQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })
  const [deleteRole] = useDeleteRoleMutation()

  const roles = rolesData?.roles || []

  const handleDelete = async (id: string) => {
    if (!currentWorkspace?.id) return

    try {
      await deleteRole({ id, workspaceId: currentWorkspace.id }).unwrap()
      toast.success('Role deleted successfully')
    } catch (error) {
      console.error('Error deleting role:', error)
      toast.error('Failed to delete role')
    }
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Role Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Create and manage custom roles with granular permissions
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions for your workspace.
              </DialogDescription>
            </DialogHeader>
            <RoleForm
              onSuccess={() => {
                setIsCreateOpen(false)
                refetch()
              }}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <Card key={role.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!role.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {role.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Type</span>
                  <Badge variant={!role.isDefault ? 'default' : 'secondary'}>
                    {!role.isDefault ? 'Custom' : 'System'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Permissions</span>
                  <span className="text-sm text-gray-600">
                    {role.permissions.length}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <p className="mb-2 text-xs text-gray-500">Key Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                    {role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
