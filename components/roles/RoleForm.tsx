'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/lib/hooks'
import {
  useCreateWorkspaceSettingsRoleMutation,
  useUpdateWorkspaceSettingsRoleMutation,
  type Role,
} from '@/lib/api/mongoApi'
import {
  MODULE_ACTIONS,
  PERMISSION_MODULES,
  PERMISSION_DEFINITIONS,
  getAdvancedPermissions,
  type ModuleAction,
  type Permission,
} from '@/lib/permissions/constants'

interface RoleFormProps {
  role?: Role
  onSuccess?: () => void
  onCancel?: () => void
}

interface RoleFormData {
  name: string
  description: string
}

const ACTION_LABELS: Record<ModuleAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

const allGridIds = PERMISSION_MODULES.flatMap(module =>
  Object.values(module.actions).flat()
)

export function RoleForm({ role, onSuccess, onCancel }: RoleFormProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissions ?? [])
  )
  const [showAdvanced, setShowAdvanced] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>({
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '' },
  })

  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [createRole, { isLoading: isCreating }] =
    useCreateWorkspaceSettingsRoleMutation()
  const [updateRole, { isLoading: isUpdating }] =
    useUpdateWorkspaceSettingsRoleMutation()
  const isLoading = isCreating || isUpdating

  const advancedPermissions = useMemo(() => getAdvancedPermissions(), [])

  const cellIds = (moduleId: string, action: ModuleAction) =>
    PERMISSION_MODULES.find(m => m.id === moduleId)?.actions[action] ?? []

  const isCellChecked = (ids: Permission[]) =>
    ids.length > 0 && ids.every(id => selected.has(id))

  const setIds = (ids: string[], on: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }

  const toggleCell = (moduleId: string, action: ModuleAction) => {
    const ids = cellIds(moduleId, action)
    setIds(ids, !isCellChecked(ids))
  }

  const columnIds = (action: ModuleAction) =>
    PERMISSION_MODULES.flatMap(module => module.actions[action] ?? [])

  const rowIds = (moduleId: string) =>
    PERMISSION_MODULES.find(m => m.id === moduleId)
      ? Object.values(PERMISSION_MODULES.find(m => m.id === moduleId)!.actions).flat()
      : []

  const onSubmit = async (data: RoleFormData) => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace not found')
      return
    }
    if (selected.size === 0) {
      toast.error('Select at least one permission')
      return
    }

    try {
      if (role) {
        await updateRole({
          id: role.id,
          workspaceId: currentWorkspace.id,
          ...data,
          permissions: Array.from(selected),
        }).unwrap()
        toast.success('Role updated successfully')
      } else {
        await createRole({
          ...data,
          permissions: Array.from(selected),
          workspaceId: currentWorkspace.id,
        }).unwrap()
        toast.success('Role created successfully')
      }
      onSuccess?.()
    } catch (error: any) {
      toast.error(
        error?.data?.message || (role ? 'Failed to update role' : 'Failed to create role')
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            placeholder="e.g. Sales Manager"
            {...register('name', { required: 'Role name is required' })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what this role can do..."
            {...register('description', { required: 'Description is required' })}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Permissions by module</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIds(allGridIds, true)}
            >
              Full access
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Module
                </th>
                {MODULE_ACTIONS.map(action => {
                  const ids = columnIds(action)
                  return (
                    <th key={action} className="px-2 py-2 text-center font-medium">
                      <label className="flex cursor-pointer flex-col items-center gap-1">
                        <span className="text-muted-foreground">{ACTION_LABELS[action]}</span>
                        <Checkbox
                          aria-label={`All ${ACTION_LABELS[action]}`}
                          checked={isCellChecked(ids)}
                          onCheckedChange={checked => setIds(ids, checked === true)}
                        />
                      </label>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map(module => {
                const ids = rowIds(module.id)
                return (
                  <tr key={module.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          aria-label={`All ${module.label}`}
                          checked={isCellChecked(ids)}
                          onCheckedChange={checked => setIds(ids, checked === true)}
                        />
                        <span className="font-medium text-foreground">{module.label}</span>
                      </label>
                    </td>
                    {MODULE_ACTIONS.map(action => {
                      const cell = module.actions[action]
                      return (
                        <td key={action} className="px-2 py-2 text-center">
                          {cell?.length ? (
                            <Checkbox
                              aria-label={`${module.label} ${ACTION_LABELS[action]}`}
                              checked={isCellChecked(cell)}
                              onCheckedChange={() => toggleCell(module.id, action)}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {advancedPermissions.length > 0 && (
          <div className="rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Advanced permissions ({advancedPermissions.length})
            </button>
            {showAdvanced && (
              <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                {advancedPermissions.map(permission => (
                  <label
                    key={permission.name}
                    className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(permission.name)}
                      onCheckedChange={checked =>
                        setIds([permission.name], checked === true)
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{permission.displayName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
          <span className="text-sm font-medium">
            Selected Permissions: {selected.size}
          </span>
          {PERMISSION_MODULES.filter(module => isCellChecked(rowIds(module.id))).map(
            module => (
              <Badge key={module.id} variant="secondary" className="text-xs">
                {module.label}: full
              </Badge>
            )
          )}
          {Array.from(selected)
            .filter(id => !allGridIds.includes(id as Permission))
            .map(id => (
              <Badge key={id} variant="outline" className="text-xs">
                {PERMISSION_DEFINITIONS[id as Permission]?.displayName ?? id}
              </Badge>
            ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? role
              ? 'Saving...'
              : 'Creating...'
            : role
              ? 'Save Changes'
              : 'Create Role'}
        </Button>
      </div>
    </form>
  )
}
