import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Blog } from '@/lib/mongodb/models/Blog'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crmprosaas.com'
const SITE_NAME = 'CRM Pro Blog'
const SITE_DESCRIPTION =
  'Expert articles on CRM strategy, sales automation, AI workflows, and business productivity.'

export const revalidate = 3600 // 1 hour

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  try {
    await connectToMongoDB()

    const blogs = await Blog.find({ status: 'published' })
      .select('title slug excerpt author publishedAt updatedAt categoryId tags')
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean()

    const categoryIds = [...new Set(blogs.map((b: any) => b.categoryId))]
    const categories = await BlogCategory.find({ _id: { $in: categoryIds } })
      .select('name')
      .lean()
    const categoryMap = new Map(categories.map((c: any) => [String(c._id), c.name]))

    const rssItems = blogs
      .map((blog: any) => {
        const categoryName = categoryMap.get(String(blog.categoryId)) || ''
        return `    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${APP_URL}/blog/${blog.slug}</link>
      <guid isPermaLink="true">${APP_URL}/blog/${blog.slug}</guid>
      <description>${escapeXml(blog.excerpt || '')}</description>
      <pubDate>${new Date(blog.publishedAt).toUTCString()}</pubDate>
      <author>${escapeXml(blog.author?.name || 'CRM Pro')}</author>
      ${categoryName ? `<category>${escapeXml(categoryName)}</category>` : ''}
      ${(blog.tags || []).map((t: string) => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`
      })
      .join('\n')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${APP_URL}/blog</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${APP_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <generator>CRM Pro Blog</generator>
${rssItems}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new NextResponse('Error generating feed', { status: 500 })
  }
}
