import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crmprosaas.com'
const API_URL = process.env.API_GATEWAY_URL

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}/home`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  try {
    const [blogsRes, catsRes] = await Promise.all([
      fetch(`${API_URL}/api/blogs?status=published`, {
        next: { revalidate: 3600 },
      }),
      fetch(`${API_URL}/api/blogs/categories`, {
        next: { revalidate: 3600 },
      }),
    ])

    const blogsData = await blogsRes.json()
    const catsData = await catsRes.json()

    const blogPages: MetadataRoute.Sitemap = (blogsData.blogs || []).map(
      (blog: any) => ({
        url: `${APP_URL}/blog/${blog.slug}`,
        lastModified: blog.updatedAt,
        changeFrequency: (blog.changeFrequency || 'weekly') as any,
        priority: blog.priority || 0.7,
      })
    )

    const categoryPages: MetadataRoute.Sitemap = (
      catsData.categories || []
    ).map((cat: any) => ({
      url: `${APP_URL}/blog?category=${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...blogPages, ...categoryPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}
