'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { useCreateRoleMutation } from '@/lib/api/mongoApi'

interface RoleFormProps {
  onSuccess?: () => void
}

interface RoleFormData {
  name: string
  description: string
  permissions: string[]
}

export function RoleForm({ onSuccess }: RoleFormProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>()

  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [createRole, { isLoading }] = useCreateRoleMutation()

  // Available permissions
  const permissions = [
    { id: 'leads.create', name: 'Create Leads', category: 'leads' },
    { id: 'leads.read', name: 'View Leads', category: 'leads' },
    { id: 'leads.update', name: 'Edit Leads', category: 'leads' },
    { id: 'leads.delete', name: 'Delete Leads', category: 'leads' },
    { id: 'users.create', name: 'Create Users', category: 'users' },
    { id: 'users.read', name: 'View Users', category: 'users' },
    { id: 'users.update', name: 'Edit Users', category: 'users' },
    { id: 'users.delete', name: 'Delete Users', category: 'users' },
    { id: 'workspace.manage', name: 'Manage Workspace', category: 'workspace' },
    { id: 'roles.manage', name: 'Manage Roles', category: 'roles' },
    { id: 'webhooks.manage', name: 'Manage Webhooks', category: 'webhooks' },
    { id: 'analytics.view', name: 'View Analytics', category: 'analytics' },
  ]

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {resources.map(resource => (
            <Card key={resource}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize">
                  {resource}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {permissions
                  .filter(p => p.category === resource)
                  .map(permission => (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() =>
                          handlePermissionToggle(permission.id)
                        }
                      />
                      <Label
                        htmlFor={permission.id}
                        className="cursor-pointer text-sm capitalize"
                      >
                        {permission.name}
                      </Label>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Role'}
        </Button>
      </div>
    </form>
  )
}
