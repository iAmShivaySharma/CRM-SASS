import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import BlogCard from '@/components/blog/BlogCard'
import Breadcrumb from '@/components/blog/Breadcrumb'

export const revalidate = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const metadata: Metadata = {
  title: 'Blog — ClearCRM | Tips, Guides & Insights for Business Growth',
  description:
    'Expert articles on CRM strategy, sales automation, AI workflows, lead management, and business productivity. Actionable insights to grow your business with ClearCRM.',
  keywords: [
    'CRM blog',
    'sales tips',
    'lead management guide',
    'CRM strategy',
    'business automation',
    'AI CRM tips',
    'sales productivity',
    'CRM best practices',
    'small business growth',
    'sales pipeline tips',
  ],
  openGraph: {
    title: 'Blog — ClearCRM | Tips, Guides & Insights for Business Growth',
    description:
      'Expert articles on CRM strategy, sales automation, AI workflows, and business productivity.',
    type: 'website',
    locale: 'en_US',
    siteName: 'ClearCRM',
    url: `${APP_URL}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — ClearCRM | Tips, Guides & Insights',
    description:
      'Expert articles on CRM strategy, sales automation, and business growth.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: `${APP_URL}/blog` },
}

async function getBlogs(
  page: number,
  category?: string,
  tag?: string,
  search?: string
) {
  const params = new URLSearchParams({ status: 'published', limit: '12' })
  params.set('page', String(page))
  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (search) params.set('q', search)

  const [blogsRes, catsRes] = await Promise.all([
    fetch(`${API_URL}/api/blogs?${params}`, { next: { revalidate: 300 } }),
    fetch(`${API_URL}/api/blogs/categories`, { next: { revalidate: 300 } }),
  ])

  const blogsData = await blogsRes.json()
  const catsData = await catsRes.json()

  return {
    blogs: blogsData.blogs || [],
    featured: blogsData.featured || [],
    categories: catsData.categories || [],
    total: blogsData.total || 0,
    totalPages: blogsData.totalPages || 1,
    page,
  }
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    category?: string
    tag?: string
    q?: string
  }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const { blogs, featured, categories, total, totalPages } = await getBlogs(
    page,
    params.category,
    params.tag,
    params.q
  )

  const blogListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'ClearCRM Blog',
    description:
      'Expert articles on CRM strategy, sales automation, AI workflows, and business productivity.',
    url: `${APP_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'ClearCRM',
      url: APP_URL,
    },
    blogPost: blogs.map((b: any) => ({
      '@type': 'BlogPosting',
      headline: b.title,
      url: `${APP_URL}/blog/${b.slug}`,
      datePublished: b.publishedAt,
      dateModified: b.updatedAt,
      author: { '@type': 'Person', name: b.author?.name },
      description: b.excerpt,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListJsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-5 py-12">
        <Breadcrumb items={[{ label: 'Blog' }]} />

        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            ClearCRM Blog
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Expert insights on CRM strategy, sales automation, AI workflows, and
            tips to grow your business faster.
          </p>
        </div>

        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !params.category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </Link>
            {categories.map((cat: any) => (
              <Link
                key={cat.slug}
                href={`/blog?category=${cat.slug}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  params.category === cat.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <form action="/blog" method="GET" className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search articles..."
              defaultValue={params.q}
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring sm:w-64"
            />
          </form>
        </div>

        {featured.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Featured
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((blog: any) => (
                <BlogCard
                  key={blog.slug}
                  title={blog.title}
                  slug={blog.slug}
                  excerpt={blog.excerpt}
                  featuredImage={blog.featuredImage}
                  featuredImageAlt={blog.featuredImageAlt}
                  publishedAt={blog.publishedAt}
                  readTime={blog.readTime}
                  category={blog.category}
                  author={blog.author}
                />
              ))}
            </div>
          </section>
        )}

        {blogs.length > 0 ? (
          <>
            <section>
              <h2 className="mb-6 text-2xl font-bold text-foreground">
                {params.category
                  ? `${categories.find((c: any) => c.slug === params.category)?.name || 'Category'} Articles`
                  : params.tag
                    ? `Tagged: ${params.tag}`
                    : params.q
                      ? `Results for "${params.q}"`
                      : 'Latest Articles'}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {blogs.map((blog: any) => (
                  <BlogCard
                    key={blog.slug}
                    title={blog.title}
                    slug={blog.slug}
                    excerpt={blog.excerpt}
                    featuredImage={blog.featuredImage}
                    featuredImageAlt={blog.featuredImageAlt}
                    publishedAt={blog.publishedAt}
                    readTime={blog.readTime}
                    category={blog.category}
                    author={blog.author}
                  />
                ))}
              </div>
            </section>

            {totalPages > 1 && (
              <nav
                aria-label="Blog pagination"
                className="mt-12 flex justify-center gap-2"
              >
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}${params.category ? `&category=${params.category}` : ''}${params.tag ? `&tag=${params.tag}` : ''}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    rel="prev"
                  >
                    Previous
                  </Link>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const pageNum = start + i
                  if (pageNum > totalPages) return null
                  return (
                    <Link
                      key={pageNum}
                      href={`/blog?page=${pageNum}${params.category ? `&category=${params.category}` : ''}${params.tag ? `&tag=${params.tag}` : ''}`}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border hover:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  )
                })}
                {page < totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}${params.category ? `&category=${params.category}` : ''}${params.tag ? `&tag=${params.tag}` : ''}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    rel="next"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">
              No articles found. Check back soon!
            </p>
          </div>
        )}
      </div>
    </>
  )
}
