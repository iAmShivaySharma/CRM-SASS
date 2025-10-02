'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { useCreateRoleMutation } from '@/lib/api/mongoApi'
import { useGetPermissionsQuery } from '@/lib/api/roleApi'

interface RoleFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface RoleFormData {
  name: string
  description: string
  permissions: string[]
}

export function RoleForm({ onSuccess, onCancel }: RoleFormProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>()

  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [createRole, { isLoading }] = useCreateRoleMutation()

  // Fetch available permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useGetPermissionsQuery(currentWorkspace?.id)
  const permissions = permissionsData || []

  const onSubmit = async (data: RoleFormData) => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace not found')
      return
    }

    try {
      const result = await createRole({
        ...data,
        permissions: selectedPermissions,
        workspaceId: currentWorkspace.id,
      }).unwrap()

      if (result.success) {
        toast.success('Role created successfully')
        onSuccess?.()
      }
    } catch (error: any) {
      console.error('Error creating role:', error)
      toast.error(error?.data?.message || 'Failed to create role')
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const resources = Array.from(new Set(permissions.map(p => p.category)))

  if (permissionsLoading) {
    return <div className="text-center py-4">Loading permissions...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            placeholder="e.g. Sales Manager"
            {...register('name', { required: 'Role name is required' })}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what this role can do..."
            {...register('description', {
              required: 'Description is required',
            })}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Permissions</Label>
        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {resources.map(resource => (
              <div key={resource} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {resource}
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const categoryPermissions = permissions
                          .filter(p => p.category === resource)
                          .map(p => p.id)
                        const allSelected = categoryPermissions.every(id =>
                          selectedPermissions.includes(id)
                        )
                        if (allSelected) {
                          setSelectedPermissions(prev =>
                            prev.filter(id => !categoryPermissions.includes(id))
                          )
                        } else {
                          setSelectedPermissions(prev => [
                            ...prev.filter(id => !categoryPermissions.includes(id)),
                            ...categoryPermissions
                          ])
                        }
                      }}
                    >
                      {permissions
                        .filter(p => p.category === resource)
                        .every(p => selectedPermissions.includes(p.id))
                        ? 'Deselect All'
                        : 'Select All'
                      }
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {permissions
                    .filter(p => p.category === resource)
                    .map(permission => (
                      <div
                        key={permission.id}
                        className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() =>
                            handlePermissionToggle(permission.id)
                          }
                          className="mt-0.5"
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <Label
                            htmlFor={permission.id}
                            className="cursor-pointer text-sm font-medium leading-none"
                          >
                            {permission.name}
                          </Label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {permission.description}
                            </p>
                          )}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {permission.id}
                          </code>
                        </div>
                      </div>
                    ))}
                </div>
                {resource !== resources[resources.length - 1] && (
                  <div className="border-b border-border mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected permissions summary */}
        {selectedPermissions.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Selected Permissions: {selectedPermissions.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions([])}
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedPermissions.slice(0, 5).map(permId => {
                const perm = permissions.find(p => p.id === permId)
                return perm ? (
                  <Badge key={permId} variant="secondary" className="text-xs">
                    {perm.name}
                  </Badge>
                ) : null
              })}
              {selectedPermissions.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedPermissions.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Role'}
        </Button>
      </div>
    </form>
  )
}
