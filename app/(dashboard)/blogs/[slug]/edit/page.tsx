'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BlogEditor from '@/components/blog/BlogEditor'
import { Loader2 } from 'lucide-react'

export default function EditBlogPage() {
  const params = useParams()
  const router = useRouter()
  const [blogData, setBlogData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBlog() {
      try {
        // Fetch all statuses for editing (not just published)
        const res = await fetch(`/api/blogs/${params.slug}`)
        if (!res.ok) {
          // Try fetching directly without status filter
          const allRes = await fetch(`/api/blogs?search=${params.slug}&status=draft`)
          const allData = await allRes.json()
          const found = allData.blogs?.find((b: any) => b.slug === params.slug)
          if (found) {
            // Fetch full content
            setBlogData(found)
          } else {
            router.push('/blogs')
            return
          }
        } else {
          const data = await res.json()
          setBlogData(data.blog)
        }
      } catch {
        router.push('/blogs')
      } finally {
        setLoading(false)
      }
    }

    if (params.slug) fetchBlog()
  }, [params.slug, router])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!blogData) return null

  return <BlogEditor initialData={blogData} isEditing />
}
