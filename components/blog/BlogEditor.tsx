'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Heading from '@tiptap/extension-heading'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link2,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Save,
  Eye,
  ArrowLeft,
  Loader2,
  Upload,
  X as XIcon,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BlogCategory {
  id: string
  name: string
  slug: string
}

interface BlogData {
  title: string
  slug: string
  content: string
  excerpt: string
  featuredImage: string
  featuredImageAlt: string
  categoryId: string
  tags: string[]
  author: { name: string; avatar: string; bio: string }
  status: 'draft' | 'published' | 'archived'
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  priority: number
  changeFrequency: string
  isFeatured: boolean
  relatedSlugs: string[]
  tableOfContents: { id: string; text: string; level: number }[]
}

interface BlogEditorProps {
  initialData?: BlogData & { id?: string }
  isEditing?: boolean
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractTableOfContents(
  html: string
): { id: string; text: string; level: number }[] {
  const toc: { id: string; text: string; level: number }[] = []
  const regex = /<h([2-4])[^>]*>(.*?)<\/h[2-4]>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const text = match[2].replace(/<[^>]*>/g, '').trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    toc.push({ id, text, level })
  }
  return toc
}

const defaultBlogData: BlogData = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  featuredImage: '',
  featuredImageAlt: '',
  categoryId: '',
  tags: [],
  author: { name: '', avatar: '', bio: '' },
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: [],
  canonicalUrl: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  priority: 0.7,
  changeFrequency: 'weekly',
  isFeatured: false,
  relatedSlugs: [],
  tableOfContents: [],
}

export default function BlogEditor({
  initialData,
  isEditing,
}: BlogEditorProps) {
  const router = useRouter()
  const [data, setData] = useState<BlogData>(initialData || defaultBlogData)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tagsInput, setTagsInput] = useState(data.tags.join(', '))
  const [keywordsInput, setKeywordsInput] = useState(
    data.metaKeywords.join(', ')
  )

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const res = await fetch('/api/blogs/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.message || 'Upload failed')
        return null
      }
      return result.url
    } catch {
      toast.error('Image upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3, 4] }),
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
    ],
    content: data.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setData(prev => ({
        ...prev,
        content: html,
        tableOfContents: extractTableOfContents(html),
      }))
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-lg dark:prose-invert max-w-none min-h-[400px] p-4 outline-none focus:outline-none',
      },
    },
  })

  useEffect(() => {
    fetch('/api/blogs/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})
  }, [])

  const updateField = useCallback(
    (field: keyof BlogData, value: any) => {
      setData(prev => {
        const updated = { ...prev, [field]: value }
        // Auto-generate slug from title
        if (field === 'title' && !isEditing) {
          updated.slug = generateSlug(value)
        }
        // Auto-fill meta title if empty
        if (field === 'title' && !prev.metaTitle) {
          updated.metaTitle = value.slice(0, 70)
        }
        return updated
      })
    },
    [isEditing]
  )

  const handleSave = async (status?: 'draft' | 'published') => {
    const saveData = {
      ...data,
      tags: tagsInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean),
      metaKeywords: keywordsInput
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean),
      ...(status ? { status } : {}),
    }

    if (!saveData.title) {
      return toast.error('Title is required')
    }
    if (!saveData.slug) {
      return toast.error('Slug is required')
    }
    if (!saveData.content || saveData.content === '<p></p>') {
      return toast.error('Content is required')
    }
    if (!saveData.categoryId) {
      return toast.error('Category is required')
    }
    if (!saveData.author.name) {
      return toast.error('Author name is required')
    }

    setSaving(true)
    try {
      const url = isEditing
        ? `/api/blogs/${initialData?.slug || data.slug}`
        : '/api/blogs'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.message || 'Failed to save')
        return
      }

      toast.success(isEditing ? 'Blog updated!' : 'Blog created!')
      router.push('/blogs')
      router.refresh()
    } catch {
      toast.error('Failed to save blog post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/blogs')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {isEditing ? 'Edit Blog Post' : 'New Blog Post'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button onClick={() => handleSave('published')} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Publish
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="Enter blog title..."
                  className="text-lg font-semibold"
                />
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center">
                  <span className="shrink-0 rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    /blog/
                  </span>
                  <Input
                    id="slug"
                    value={data.slug}
                    onChange={e =>
                      updateField(
                        'slug',
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      )
                    }
                    placeholder="url-slug"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              {/* Editor Toolbar */}
              {editor && (
                <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-muted' : ''}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-muted' : ''}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'bg-muted' : ''}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    className={editor.isActive('code') ? 'bg-muted' : ''}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                  <div className="mx-1 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    className={
                      editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''
                    }
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    className={
                      editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''
                    }
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>
                  <div className="mx-1 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                    className={editor.isActive('bulletList') ? 'bg-muted' : ''}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                    className={editor.isActive('orderedList') ? 'bg-muted' : ''}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                    className={editor.isActive('blockquote') ? 'bg-muted' : ''}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                  <div className="mx-1 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = prompt('Enter link URL:')
                      if (url) {
                        editor.chain().focus().setLink({ href: url }).run()
                      }
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative"
                    disabled={uploading}
                    onClick={() =>
                      document.getElementById('editor-image-upload')?.click()
                    }
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    id="editor-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file || !editor) return
                      const url = await uploadImage(file)
                      if (url) {
                        editor.chain().focus().setImage({ src: url }).run()
                      }
                      e.target.value = ''
                    }}
                  />
                  <div className="mx-1 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Editor */}
              <div className="min-h-[400px] rounded-lg border border-border bg-background">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Category */}
              <div>
                <Label>Category</Label>
                <Select
                  value={data.categoryId}
                  onValueChange={v => updateField('categoryId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Excerpt */}
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={data.excerpt}
                  onChange={e => updateField('excerpt', e.target.value)}
                  placeholder="Brief summary (max 300 chars)..."
                  rows={3}
                  maxLength={300}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.excerpt.length}/300
                </p>
              </div>

              {/* Featured Image */}
              <div>
                <Label>Featured Image</Label>
                {data.featuredImage ? (
                  <div className="relative mt-1 overflow-hidden rounded-lg border border-border">
                    <Image
                      src={data.featuredImage}
                      alt={data.featuredImageAlt || 'Featured image'}
                      width={300}
                      height={170}
                      className="h-auto w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => updateField('featuredImage', '')}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {uploading ? 'Uploading...' : 'Click to upload image'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      JPEG, PNG, WebP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadImage(file)
                        if (url) {
                          updateField('featuredImage', url)
                          if (!data.featuredImageAlt) {
                            updateField(
                              'featuredImageAlt',
                              file.name
                                .replace(/\.[^.]+$/, '')
                                .replace(/[-_]/g, ' ')
                            )
                          }
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
              <div>
                <Label htmlFor="featuredImageAlt">Image Alt Text</Label>
                <Input
                  id="featuredImageAlt"
                  value={data.featuredImageAlt}
                  onChange={e =>
                    updateField('featuredImageAlt', e.target.value)
                  }
                  placeholder="Descriptive alt text for SEO"
                />
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="crm, sales, automation"
                />
              </div>

              {/* Author */}
              <div>
                <Label htmlFor="authorName">Author Name</Label>
                <Input
                  id="authorName"
                  value={data.author.name}
                  onChange={e =>
                    setData(prev => ({
                      ...prev,
                      author: { ...prev.author, name: e.target.value },
                    }))
                  }
                  placeholder="Author name"
                />
              </div>
              <div>
                <Label htmlFor="authorBio">Author Bio</Label>
                <Textarea
                  id="authorBio"
                  value={data.author.bio}
                  onChange={e =>
                    setData(prev => ({
                      ...prev,
                      author: { ...prev.author, bio: e.target.value },
                    }))
                  }
                  placeholder="Short author bio..."
                  rows={2}
                />
              </div>

              {/* Featured toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.isFeatured}
                  onChange={e => updateField('isFeatured', e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm">Mark as Featured</span>
              </label>
            </div>
          </div>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <div className="rounded-lg border border-border p-6">
            <h3 className="mb-4 text-lg font-semibold">
              Search Engine Preview
            </h3>
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-lg text-primary">
                {data.metaTitle || data.title || 'Page Title'}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {process.env.NEXT_PUBLIC_APP_URL || 'https://yoursite.com'}
                /blog/{data.slug || 'slug'}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.metaDescription ||
                  data.excerpt ||
                  'Meta description will appear here...'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="metaTitle">
                Meta Title{' '}
                <span className="text-xs text-muted-foreground">
                  ({data.metaTitle.length}/70)
                </span>
              </Label>
              <Input
                id="metaTitle"
                value={data.metaTitle}
                onChange={e =>
                  updateField('metaTitle', e.target.value.slice(0, 70))
                }
                placeholder="SEO title (max 70 chars)"
                maxLength={70}
              />
            </div>
            <div>
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                value={data.canonicalUrl}
                onChange={e => updateField('canonicalUrl', e.target.value)}
                placeholder="Leave empty for auto-generated"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="metaDescription">
                Meta Description{' '}
                <span className="text-xs text-muted-foreground">
                  ({data.metaDescription.length}/160)
                </span>
              </Label>
              <Textarea
                id="metaDescription"
                value={data.metaDescription}
                onChange={e =>
                  updateField('metaDescription', e.target.value.slice(0, 160))
                }
                placeholder="SEO description (max 160 chars)"
                rows={2}
                maxLength={160}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="metaKeywords">
                Meta Keywords (comma-separated)
              </Label>
              <Input
                id="metaKeywords"
                value={keywordsInput}
                onChange={e => setKeywordsInput(e.target.value)}
                placeholder="crm software, sales automation, lead management"
              />
            </div>
          </div>

          {/* Open Graph */}
          <div className="rounded-lg border border-border p-6">
            <h3 className="mb-4 text-lg font-semibold">
              Open Graph (Facebook/LinkedIn)
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="ogTitle">OG Title</Label>
                <Input
                  id="ogTitle"
                  value={data.ogTitle}
                  onChange={e => updateField('ogTitle', e.target.value)}
                  placeholder="Falls back to meta title"
                />
              </div>
              <div>
                <Label>OG Image</Label>
                {data.ogImage ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex-1 truncate rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {data.ogImage.split('/').pop()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField('ogImage', '')}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50">
                    <Upload className="h-4 w-4" />
                    <span>Upload (1200x630 recommended)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadImage(file)
                        if (url) updateField('ogImage', url)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={data.ogDescription}
                  onChange={e => updateField('ogDescription', e.target.value)}
                  placeholder="Falls back to meta description"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Twitter Card */}
          <div className="rounded-lg border border-border p-6">
            <h3 className="mb-4 text-lg font-semibold">Twitter Card</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="twitterTitle">Twitter Title</Label>
                <Input
                  id="twitterTitle"
                  value={data.twitterTitle}
                  onChange={e => updateField('twitterTitle', e.target.value)}
                  placeholder="Falls back to meta title"
                />
              </div>
              <div>
                <Label>Twitter Image</Label>
                {data.twitterImage ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex-1 truncate rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {data.twitterImage.split('/').pop()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField('twitterImage', '')}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50">
                    <Upload className="h-4 w-4" />
                    <span>Upload (falls back to OG image)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadImage(file)
                        if (url) updateField('twitterImage', url)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="twitterDescription">Twitter Description</Label>
                <Textarea
                  id="twitterDescription"
                  value={data.twitterDescription}
                  onChange={e =>
                    updateField('twitterDescription', e.target.value)
                  }
                  placeholder="Falls back to meta description"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select
                value={data.status}
                onValueChange={v => updateField('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sitemap Priority</Label>
              <Select
                value={String(data.priority)}
                onValueChange={v => updateField('priority', parseFloat(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">1.0 (Highest)</SelectItem>
                  <SelectItem value="0.9">0.9</SelectItem>
                  <SelectItem value="0.8">0.8</SelectItem>
                  <SelectItem value="0.7">0.7 (Default)</SelectItem>
                  <SelectItem value="0.6">0.6</SelectItem>
                  <SelectItem value="0.5">0.5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Change Frequency</Label>
              <Select
                value={data.changeFrequency}
                onValueChange={v => updateField('changeFrequency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="relatedSlugs">
                Related Post Slugs (comma-separated)
              </Label>
              <Input
                id="relatedSlugs"
                value={data.relatedSlugs.join(', ')}
                onChange={e =>
                  updateField(
                    'relatedSlugs',
                    e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="post-slug-1, post-slug-2"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
