'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateColumnMutation, useUpdateColumnMutation, useDeleteColumnMutation, type Column } from '@/lib/api/projectsApi'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'

interface ColumnManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  column?: Column
  mode: 'create' | 'edit' | 'delete'
}

const colorOptions = [
  { value: 'bg-gray-100', label: 'Gray', color: '#f3f4f6' },
  { value: 'bg-blue-100', label: 'Blue', color: '#dbeafe' },
  { value: 'bg-green-100', label: 'Green', color: '#dcfce7' },
  { value: 'bg-yellow-100', label: 'Yellow', color: '#fef3c7' },
  { value: 'bg-red-100', label: 'Red', color: '#fee2e2' },
  { value: 'bg-purple-100', label: 'Purple', color: '#f3e8ff' },
  { value: 'bg-pink-100', label: 'Pink', color: '#fce7f3' },
  { value: 'bg-indigo-100', label: 'Indigo', color: '#e0e7ff' },
]

export function ColumnManagementDialog({
  open,
  onOpenChange,
  projectId,
  column,
  mode,
}: ColumnManagementDialogProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [name, setName] = useState(column?.name || '')
  const [color, setColor] = useState(column?.color || 'bg-gray-100')
  const [slug, setSlug] = useState(column?.slug || '')

  const [createColumn, { isLoading: isCreating }] = useCreateColumnMutation()
  const [updateColumn, { isLoading: isUpdating }] = useUpdateColumnMutation()
  const [deleteColumn, { isLoading: isDeleting }] = useDeleteColumnMutation()

  const isLoading = isCreating || isUpdating || isDeleting

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    if (mode === 'create') {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  const handleSubmit = async () => {
    if (!currentWorkspace) {
      toast.error('No workspace selected')
      return
    }

    try {
      if (mode === 'create') {
        if (!name.trim() || !slug.trim()) {
          toast.error('Name and slug are required')
          return
        }

        await createColumn({
          name: name.trim(),
          slug: slug.trim(),
          color,
          projectId,
          workspaceId: currentWorkspace.id,
        }).unwrap()

        toast.success('Column created successfully')
      } else if (mode === 'edit' && column) {
        if (!name.trim()) {
          toast.error('Name is required')
          return
        }

        await updateColumn({
          id: column.id,
          data: {
            name: name.trim(),
            color,
            ...(slug !== column.slug && { slug: slug.trim() }),
          },
        }).unwrap()

        toast.success('Column updated successfully')
      } else if (mode === 'delete' && column) {
        await deleteColumn({
          id: column.id,
        }).unwrap()

        toast.success('Column deleted successfully')
      }

      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      toast.error(error?.data?.message || 'An error occurred')
    }
  }

  const resetForm = () => {
    setName('')
    setSlug('')
    setColor('bg-gray-100')
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Create Column'}
            {mode === 'edit' && 'Edit Column'}
            {mode === 'delete' && 'Delete Column'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Create a new column for this project.'}
            {mode === 'edit' && 'Edit the column details.'}
            {mode === 'delete' && 'Are you sure you want to delete this column? This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        {mode !== 'delete' && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Column name"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="column-slug"
                disabled={isLoading || mode === 'edit'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'edit' ? 'Slug cannot be changed after creation' : 'Auto-generated from name'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Select value={color} onValueChange={setColor} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${color}`} />
                      {colorOptions.find(opt => opt.value === color)?.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${option.value}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {mode === 'delete' && column && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Column: <span className="font-medium">{column.name}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            variant={mode === 'delete' ? 'destructive' : 'default'}
          >
            {isLoading && 'Processing...'}
            {!isLoading && mode === 'create' && 'Create'}
            {!isLoading && mode === 'edit' && 'Save Changes'}
            {!isLoading && mode === 'delete' && 'Delete Column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}