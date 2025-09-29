'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'
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
  useGetTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
} from '@/lib/api/mongoApi'

interface LeadTag {
  id: string
  name: string
  color: string
  description?: string
}

export function TagManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<LeadTag | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [description, setDescription] = useState('')

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // RTK Query hooks
  const {
    data: tagsData,
    isLoading,
    refetch,
  } = useGetTagsQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })
  const [createTag] = useCreateTagMutation()
  const [deleteTag] = useDeleteTagMutation()

  const tags = tagsData?.tags || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace?.id) return

    try {
      await createTag({
        name,
        color,
        description,
        workspaceId: currentWorkspace.id,
      }).unwrap()

      toast.success('Tag created successfully')
      resetForm()
    } catch (error) {
      console.error('Error creating tag:', error)
      toast.error('Failed to create tag')
    }
  }

  const handleEdit = (tag: LeadTag) => {
    setEditingTag(tag)
    setName(tag.name)
    setColor(tag.color)
    setDescription(tag.description || '')
    setIsCreateOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentWorkspace?.id) return

    try {
      await deleteTag({ id, workspaceId: currentWorkspace.id }).unwrap()
      toast.success('Tag deleted successfully')
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('Failed to delete tag')
    }
  }

  const resetForm = () => {
    setName('')
    setColor('#3b82f6')
    setDescription('')
    setEditingTag(null)
    setIsCreateOpen(false)
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
            Lead Tags
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Organize and categorize your leads
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
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Edit' : 'Create'} Tag</DialogTitle>
              <DialogDescription>
                {editingTag
                  ? 'Update the tag details.'
                  : 'Create a new tag to organize your leads.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tag Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Hot Lead"
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
                  placeholder="Describe when to use this tag..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTag ? 'Update' : 'Create'} Tag
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tags.map(tag => (
          <Card key={tag.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" style={{ color: tag.color }} />
                  <CardTitle className="text-lg">{tag.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tag)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tag.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {tag.description && (
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {tag.description}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="py-12 text-center">
          <Tag className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">No tags found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Create your first tag to get started
          </p>
        </div>
      )}
    </div>
  )
}
