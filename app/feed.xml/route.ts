import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crmprosaas.com'
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const SITE_NAME = 'ClearCRM Blog'
const SITE_DESCRIPTION =
  'Expert articles on CRM strategy, sales automation, AI workflows, and business productivity.'

export const revalidate = 3600

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
    const res = await fetch(
      `${API_URL}/api/blogs?status=published&limit=50`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    const blogs = data.blogs || []

    const rssItems = blogs
      .map((blog: any) => {
        const categoryName = blog.category?.name || ''
        return `    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${APP_URL}/blog/${blog.slug}</link>
      <guid isPermaLink="true">${APP_URL}/blog/${blog.slug}</guid>
      <description>${escapeXml(blog.excerpt || '')}</description>
      <pubDate>${new Date(blog.publishedAt).toUTCString()}</pubDate>
      <author>${escapeXml(blog.author?.name || 'ClearCRM')}</author>
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
    <generator>ClearCRM Blog</generator>
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
