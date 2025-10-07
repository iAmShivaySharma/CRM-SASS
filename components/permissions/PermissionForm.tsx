'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { useGetPermissionsQuery } from '@/lib/api/roleApi'

interface PermissionFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface PermissionFormData {
  resource: string
  action: string
  displayName: string
  description: string
  category: string
}

const CATEGORIES = [
  { value: 'Core', label: 'Core' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Analytics', label: 'Analytics' },
  { value: 'Integration', label: 'Integration' },
  { value: 'Custom', label: 'Custom' },
]

const COMMON_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'view',
  'export',
  'import',
  'assign',
]

export function PermissionForm({ onSuccess, onCancel }: PermissionFormProps) {
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PermissionFormData>()

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // Fetch existing permissions for dependencies
  const { data: existingPermissionsData, isLoading: permissionsLoading } =
    useGetPermissionsQuery(currentWorkspace?.id)
  const existingPermissions = existingPermissionsData || []

  // Watch resource and action to generate permission name
  const resource = watch('resource')
  const action = watch('action')
  const permissionName = resource && action ? `${resource}.${action}` : ''

  const onSubmit = async (data: PermissionFormData) => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace not found')
      return
    }

    setIsLoading(true)
    try {
      // This would be replaced with actual API call
      /*
      const response = await fetch(`/api/permissions/manage?workspaceId=${currentWorkspace.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          dependencies: selectedDependencies,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create permission')
      }
      */

      // Mock success for demonstration
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Permission created successfully')
      onSuccess?.()
    } catch (error: any) {
      console.error('Error creating permission:', error)
      toast.error(error?.message || 'Failed to create permission')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDependencyToggle = (permissionId: string) => {
    setSelectedDependencies(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleCommonActionSelect = (selectedAction: string) => {
    setValue('action', selectedAction)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      {/* Permission Name Preview */}
      {permissionName && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Permission Name:</Label>
              <code className="rounded bg-white px-2 py-1 text-sm dark:bg-gray-800">
                {permissionName}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="resource">Resource</Label>
          <Input
            id="resource"
            placeholder="e.g. leads, users, reports"
            {...register('resource', {
              required: 'Resource is required',
              pattern: {
                value: /^[a-z][a-z0-9_]*$/,
                message: 'Resource must be lowercase with underscores only',
              },
            })}
          />
          {errors.resource && (
            <p className="text-sm text-red-600">{errors.resource.message}</p>
          )}
          <p className="text-xs text-gray-500">
            The resource this permission applies to (lowercase, no spaces)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="action">Action</Label>
          <Input
            id="action"
            placeholder="e.g. create, read, update, delete"
            {...register('action', {
              required: 'Action is required',
              pattern: {
                value: /^[a-z][a-z0-9_]*$/,
                message: 'Action must be lowercase with underscores only',
              },
            })}
          />
          {errors.action && (
            <p className="text-sm text-red-600">{errors.action.message}</p>
          )}

          {/* Common Actions */}
          <div className="mt-2 flex flex-wrap gap-1">
            <p className="mb-1 w-full text-xs text-gray-500">Common actions:</p>
            {COMMON_ACTIONS.map(action => (
              <Button
                key={action}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => handleCommonActionSelect(action)}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          placeholder="e.g. Create Leads"
          {...register('displayName', { required: 'Display name is required' })}
        />
        {errors.displayName && (
          <p className="text-sm text-red-600">{errors.displayName.message}</p>
        )}
        <p className="text-xs text-gray-500">
          Human-readable name that will be shown in the UI
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this permission allows users to do..."
          {...register('description')}
        />
        <p className="text-xs text-gray-500">
          Optional description explaining what this permission grants
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={value => setValue('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Category helps organize permissions in the UI
        </p>
      </div>

      {/* Dependencies */}
      <div className="space-y-4">
        <Label>Dependencies (Optional)</Label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select permissions that must be granted for this permission to work
          properly
        </p>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Required Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            {permissionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center space-x-2"
                  >
                    <div className="h-4 w-4 rounded bg-gray-200"></div>
                    <div className="h-4 w-32 rounded bg-gray-200"></div>
                  </div>
                ))}
              </div>
            ) : existingPermissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No existing permissions found. Create some permissions first to
                set up dependencies.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {existingPermissions.map(permission => (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={selectedDependencies.includes(permission.id)}
                        onCheckedChange={() =>
                          handleDependencyToggle(permission.id)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={permission.id}
                          className="block cursor-pointer text-sm font-medium"
                        >
                          {permission.name}
                        </Label>
                        <code className="text-xs text-muted-foreground">
                          {permission.id}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Dependencies Preview */}
      {selectedDependencies.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="p-4">
            <Label className="mb-2 block text-sm font-medium">
              Selected Dependencies:
            </Label>
            <div className="flex flex-wrap gap-1">
              {selectedDependencies.map(dep => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Permission'}
        </Button>
      </div>
    </form>
  )
}
