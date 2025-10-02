'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BlockEditor } from '@/components/ui/block-editor'
import { useCreateDocumentMutation, useUpdateDocumentMutation } from '@/lib/api/projectsApi'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['document', 'template', 'note']).default('document'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  visibility: z.enum(['private', 'project', 'workspace']).default('project'),
  tags: z.array(z.string()).optional(),
})

type DocumentFormData = z.infer<typeof documentSchema>

interface DocumentEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  document?: {
    id: string
    title: string
    content: any[]
    type: 'document' | 'template' | 'note'
    status: 'draft' | 'published' | 'archived'
    visibility: 'private' | 'project' | 'workspace'
    tags?: string[]
  }
}

export function DocumentEditorDialog({
  open,
  onOpenChange,
  projectId,
  document,
}: DocumentEditorDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState<any[]>(document?.content || [])
  const [tags, setTags] = useState<string[]>(document?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const [createDocument] = useCreateDocumentMutation()
  const [updateDocument] = useUpdateDocumentMutation()

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: document?.title || '',
      type: document?.type || 'document',
      status: document?.status || 'draft',
      visibility: document?.visibility || 'project',
      tags: document?.tags || [],
    },
  })

  // Reset form when document changes
  useEffect(() => {
    if (document) {
      form.reset({
        title: document.title,
        type: document.type,
        status: document.status,
        visibility: document.visibility,
        tags: document.tags || [],
      })
      setContent(document.content || [])
      setTags(document.tags || [])
    } else {
      form.reset({
        title: '',
        type: 'document',
        status: 'draft',
        visibility: 'project',
        tags: [],
      })
      setContent([])
      setTags([])
    }
  }, [document, form])

  const onSubmit = async (data: DocumentFormData) => {
    if (!currentWorkspace) return

    setIsLoading(true)
    try {
      const documentData = {
        ...data,
        content,
        tags,
        projectId,
        workspaceId: currentWorkspace.id,
      }

      if (document) {
        // Update existing document
        await updateDocument({
          id: document.id,
          data: documentData,
        }).unwrap()
        toast.success('Document updated successfully')
      } else {
        // Create new document
        await createDocument(documentData).unwrap()
        toast.success('Document created successfully')
      }

      onOpenChange(false)
      form.reset()
      setContent([])
      setTags([])
      setTagInput('')
    } catch (error) {
      console.error('Failed to save document:', error)
      toast.error('Failed to save document')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    form.handleSubmit(onSubmit)()
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Edit Document' : 'Create New Document'}
          </DialogTitle>
          <DialogDescription>
            {document ? 'Edit your document content and settings' : 'Create a new document for your project'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter document title..."
                {...form.register('title')}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Document settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(value) => form.setValue('type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={form.watch('visibility')}
                  onValueChange={(value) => form.setValue('visibility', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="workspace">Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1 overflow-hidden">
            <Label>Content</Label>
            <div className="mt-2 border rounded-lg overflow-hidden h-full">
              <BlockEditor
                content={content}
                onChange={setContent}
                onSave={handleSave}
                placeholder="Start writing your document..."
                className="h-full min-h-[400px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {document ? 'Update' : 'Create'} Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}