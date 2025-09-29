'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'
import {
  useGetLeadStatusesQuery,
  useCreateLeadStatusMutation,
  useDeleteLeadStatusMutation,
} from '@/lib/api/mongoApi'

interface LeadStatus {
  id: string
  name: string
  color: string
  description?: string
  order: number
  isDefault: boolean
  isActive: boolean
}

export function LeadStatusManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [description, setDescription] = useState('')

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // RTK Query hooks
  const {
    data: statusesData,
    isLoading,
    refetch,
  } = useGetLeadStatusesQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })
  const [createLeadStatus] = useCreateLeadStatusMutation()
  const [deleteLeadStatus] = useDeleteLeadStatusMutation()

  const statuses = statusesData?.statuses || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace?.id) return

    try {
      await createLeadStatus({
        name,
        color,
        description,
        workspaceId: currentWorkspace.id,
        order: statuses.length,
        isDefault: false,
        isActive: true,
      }).unwrap()

      toast.success('Lead status created successfully')
      resetForm()
    } catch (error) {
      console.error('Error saving lead status:', error)
      toast.error('Failed to save lead status')
    }
  }

  const resetForm = () => {
    setName('')
    setColor('#3b82f6')
    setDescription('')
    setEditingStatus(null)
    setIsCreateOpen(false)
  }

  const handleEdit = (status: LeadStatus) => {
    setEditingStatus(status)
    setName(status.name)
    setColor(status.color)
    setDescription(status.description || '')
    setIsCreateOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentWorkspace?.id) return

    try {
      await deleteLeadStatus({ id, workspaceId: currentWorkspace.id }).unwrap()
      toast.success('Lead status deleted successfully')
    } catch (error) {
      console.error('Error deleting lead status:', error)
      toast.error('Failed to delete lead status')
    }
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lead Statuses
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your lead pipeline statuses
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={open => {
            if (!open) resetForm()
            setIsCreateOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? 'Edit' : 'Create'} Lead Status
              </DialogTitle>
              <DialogDescription>
                {editingStatus
                  ? 'Update the lead status details.'
                  : 'Create a new status for your lead pipeline.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Status Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Qualified"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="h-10 w-16"
                  />
                  <Input
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe when to use this status..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStatus ? 'Update' : 'Create'} Status
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statuses.map(status => (
          <Card key={status.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Circle
                    className="h-4 w-4"
                    style={{ color: status.color, fill: status.color }}
                  />
                  <CardTitle className="text-lg">{status.name}</CardTitle>
                  {status.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(status)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!status.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(status.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {status.description && (
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {status.description}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {statuses.length === 0 && (
        <div className="py-12 text-center">
          <Circle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No lead statuses found
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Create your first status to get started
          </p>
        </div>
      )}
    </div>
  )
}
