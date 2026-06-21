'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ExternalLink,
  FileText, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface BlogPost {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  publishedAt: string | null
  views: number
  readTime: number
  category?: { name: string; slug: string }
  author: { name: string }
  createdAt: string
  updatedAt: string
}

export default function BlogsManagementPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchBlogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/blogs?${params}`)
      const data = await res.json()
      setBlogs(data.blogs || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch {
      toast.error('Failed to fetch blogs')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchBlogs()
  }, [fetchBlogs])

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    try {
      const res = await fetch(`/api/blogs/${slug}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Blog post deleted')
        fetchBlogs()
      } else {
        toast.error('Failed to delete blog post')
      }
    } catch {
      toast.error('Failed to delete blog post')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    }
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}
      >
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your blog posts for SEO and organic traffic
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/blogs/categories">
            <Button variant="outline">Categories</Button>
          </Link>
          <Link href="/blogs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={v => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {total} blog post{total !== 1 ? 's' : ''} found
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Title</th>
              <th className="hidden px-4 py-3 md:table-cell">Status</th>
              <th className="hidden px-4 py-3 lg:table-cell">Author</th>
              <th className="hidden px-4 py-3 md:table-cell">Views</th>
              <th className="hidden px-4 py-3 lg:table-cell">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : blogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No blog posts found</p>
                  <Link href="/blogs/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                    Create your first post
                  </Link>
                </td>
              </tr>
            ) : (
              blogs.map(blog => (
                <tr key={blog.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">
                        {blog.title}
                      </p>
                      <p className="text-xs text-muted-foreground">/blog/{blog.slug}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {getStatusBadge(blog.status)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {blog.author?.name}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {blog.views?.toLocaleString() || 0}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {blog.publishedAt
                      ? new Date(blog.publishedAt).toLocaleDateString()
                      : new Date(blog.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/blogs/${blog.slug}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {blog.status === 'published' && (
                          <DropdownMenuItem asChild>
                            <a href={`/blog/${blog.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Live
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(blog.slug)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
