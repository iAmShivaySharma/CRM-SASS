'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Share, MoreVertical, Eye, EyeOff, Users, Globe, Lock } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useGetDocumentQuery, useUpdateDocumentMutation } from '@/lib/api/projectsApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TiptapEditor } from '@/components/ui/tiptap-editor-improved'
import { toast } from 'sonner'

export default function DocumentEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const documentId = params?.id as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState<string>('')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [visibility, setVisibility] = useState<'private' | 'project' | 'workspace'>('project')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Get document data
  const {
    data: documentData,
    isLoading: documentLoading,
    error: documentError,
  } = useGetDocumentQuery({ id: documentId }, { skip: !documentId })

  const [updateDocument] = useUpdateDocumentMutation()

  // Initialize form with document data
  useEffect(() => {
    if (documentData?.document) {
      const doc = documentData.document
      console.log('Frontend received document:', doc)
      console.log('Document content:', doc.content, typeof doc.content)
      console.log('Document tags:', doc.tags)

      setTitle(doc.title)
      // Handle conversion from array format to HTML string
      const contentToSet = Array.isArray(doc.content)
        ? doc.content.map(block => typeof block === 'string' ? block : block?.content || '').join('')
        : doc.content || ''
      setContent(contentToSet)
      setStatus(doc.status)
      setVisibility(doc.visibility)
      setTags(doc.tags?.map((tag: any) =>
        typeof tag === 'string' ? tag : (tag.text || String(tag))
      ) || [])
    }
  }, [documentData])

  const handleSave = async () => {
    if (!documentData?.document) return

    setIsLoading(true)
    try {
      const saveData = {
        title,
        content,
        status,
        visibility,
        tags: tags,
      }

      console.log('Frontend preparing to save data:', JSON.stringify(saveData, null, 2))
      console.log('Tags being sent:', saveData.tags, typeof saveData.tags)

      await updateDocument({
        id: documentId,
        data: saveData,
      }).unwrap()

      setLastSaved(new Date())
      toast.success('Document saved successfully')
    } catch (error) {
      console.error('Failed to save document:', error)
      toast.error('Failed to save document')
    } finally {
      setIsLoading(false)
    }
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

  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'project':
        return <Users className="h-4 w-4" />
      case 'workspace':
        return <Globe className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
  }

  if (documentLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading document...</div>
      </div>
    )
  }

  if (documentError || !documentData?.document) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Document not found</h2>
          <p className="text-muted-foreground">The document you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/projects/documents')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={getStatusColor()}>
                {status}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getVisibilityIcon()}
                <span className="capitalize">{visibility}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-sm text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}

            <Select value={status} onValueChange={(value) => setStatus(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={visibility} onValueChange={(value) => setVisibility(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="workspace">Workspace</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Delete Document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Title */}
          <div className="mb-8">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Document"
              className="text-4xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <Input
                placeholder="Add tags..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="mb-8">
            <TiptapEditor
              content={content}
              onChange={setContent}
              onSave={handleSave}
              placeholder="Start writing your document..."
              className="min-h-[600px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}