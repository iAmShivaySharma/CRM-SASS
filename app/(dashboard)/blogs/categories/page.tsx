'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, Save, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  metaTitle: string
  metaDescription: string
  order: number
  isActive: boolean
  postCount: number
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    metaTitle: '',
    metaDescription: '',
    order: 0,
  })

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/blogs/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
      metaTitle: name.slice(0, 70),
    }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.slug.trim()) return toast.error('Slug is required')

    setSaving(true)
    try {
      const res = await fetch('/api/blogs/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Failed to create category')
        return
      }

      toast.success('Category created!')
      setForm({
        name: '',
        slug: '',
        description: '',
        metaTitle: '',
        metaDescription: '',
        order: 0,
      })
      setShowForm(false)
      fetchCategories()
    } catch {
      toast.error('Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return

    try {
      const res = await fetch(`/api/blogs/categories/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Category deleted')
        fetchCategories()
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/blogs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Blog Categories
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage categories to organize your blog posts
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <X className="mr-2 h-4 w-4" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {showForm ? 'Cancel' : 'New Category'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Sales Tips"
              />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ''),
                  }))
                }
                placeholder="sales-tips"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={e =>
                  setForm(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of this category..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="cat-meta-title">
                Meta Title{' '}
                <span className="text-xs text-muted-foreground">
                  ({form.metaTitle.length}/70)
                </span>
              </Label>
              <Input
                id="cat-meta-title"
                value={form.metaTitle}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    metaTitle: e.target.value.slice(0, 70),
                  }))
                }
                placeholder="SEO title"
                maxLength={70}
              />
            </div>
            <div>
              <Label htmlFor="cat-order">Display Order</Label>
              <Input
                id="cat-order"
                type="number"
                value={form.order}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    order: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cat-meta-desc">
                Meta Description{' '}
                <span className="text-xs text-muted-foreground">
                  ({form.metaDescription.length}/160)
                </span>
              </Label>
              <Textarea
                id="cat-meta-desc"
                value={form.metaDescription}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    metaDescription: e.target.value.slice(0, 160),
                  }))
                }
                placeholder="SEO description for this category page"
                rows={2}
                maxLength={160}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="hidden px-4 py-3 md:table-cell">Posts</th>
              <th className="hidden px-4 py-3 md:table-cell">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No categories yet. Create one to start writing blog posts.
                </td>
              </tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {cat.slug}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {cat.postCount}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {cat.order}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
