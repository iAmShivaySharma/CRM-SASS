import type { MetadataRoute } from 'next'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Blog } from '@/lib/mongodb/models/Blog'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crmprosaas.com'

export const revalidate = 3600 // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
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
    await connectToMongoDB()

    // Blog posts
    const blogs = await Blog.find({ status: 'published' })
      .select('slug updatedAt priority changeFrequency')
      .sort({ publishedAt: -1 })
      .lean()

    const blogPages: MetadataRoute.Sitemap = blogs.map((blog: any) => ({
      url: `${APP_URL}/blog/${blog.slug}`,
      lastModified: blog.updatedAt,
      changeFrequency: (blog.changeFrequency || 'weekly') as any,
      priority: blog.priority || 0.7,
    }))

    // Blog categories
    const categories = await BlogCategory.find({ isActive: true })
      .select('slug updatedAt')
      .lean()

    const categoryPages: MetadataRoute.Sitemap = categories.map((cat: any) => ({
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
