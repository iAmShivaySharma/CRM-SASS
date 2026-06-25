import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, User, Tag, Eye } from 'lucide-react'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Blog } from '@/lib/mongodb/models/Blog'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'
import Breadcrumb from '@/components/blog/Breadcrumb'
import TableOfContents from '@/components/blog/TableOfContents'
import ShareButtons from '@/components/blog/ShareButtons'
import RelatedPosts from '@/components/blog/RelatedPosts'
import BlogContent from '@/components/blog/BlogContent'

export const revalidate = 600

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

interface BlogPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    await connectToMongoDB()
    const blogs = await Blog.find({ status: 'published' })
      .select('slug')
      .sort({ publishedAt: -1 })
      .limit(100)
      .lean()
    return blogs.map((b: any) => ({ slug: b.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  try {
    await connectToMongoDB()
    const { slug } = await params
    const blog = await Blog.findOne({ slug, status: 'published' })
      .select(
        'title metaTitle metaDescription metaKeywords ogTitle ogDescription ogImage twitterTitle twitterDescription twitterImage canonicalUrl featuredImage excerpt publishedAt updatedAt author'
      )
      .lean()

    if (!blog) return { title: 'Blog Post Not Found' }

    const b = blog as any
    const title = b.metaTitle || `${b.title} — CRM Pro Blog`
    const description = b.metaDescription || b.excerpt || ''
    const canonical = b.canonicalUrl || `${APP_URL}/blog/${slug}`
    const ogImage = b.ogImage || b.featuredImage || ''

    return {
      title,
      description,
      keywords: b.metaKeywords || [],
      authors: [{ name: b.author?.name }],
      openGraph: {
        title: b.ogTitle || title,
        description: b.ogDescription || description,
        type: 'article',
        locale: 'en_US',
        siteName: 'CRM Pro',
        url: canonical,
        publishedTime: b.publishedAt?.toISOString(),
        modifiedTime: b.updatedAt?.toISOString(),
        authors: [b.author?.name],
        ...(ogImage
          ? {
              images: [
                { url: ogImage, width: 1200, height: 630, alt: b.title },
              ],
            }
          : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: b.twitterTitle || title,
        description: b.twitterDescription || description,
        ...(b.twitterImage || ogImage
          ? { images: [b.twitterImage || ogImage] }
          : {}),
      },
      robots: { index: true, follow: true },
      alternates: { canonical },
    }
  } catch {
    return { title: 'Blog — CRM Pro' }
  }
}

async function getBlogData(slug: string) {
  await connectToMongoDB()

  const blog = await Blog.findOne({ slug, status: 'published' }).lean()
  if (!blog) return null

  const b = blog as any

  Blog.updateOne({ slug }, { $inc: { views: 1 } }).exec()

  const category = await BlogCategory.findById(b.categoryId)
    .select('name slug')
    .lean()

  let relatedPosts: any[] = []
  if (b.relatedSlugs?.length > 0) {
    relatedPosts = await Blog.find({
      slug: { $in: b.relatedSlugs },
      status: 'published',
    })
      .select(
        'title slug excerpt featuredImage featuredImageAlt publishedAt readTime'
      )
      .lean()
  }

  if (relatedPosts.length < 3) {
    const morePosts = await Blog.find({
      categoryId: b.categoryId,
      slug: { $ne: slug },
      status: 'published',
    })
      .select(
        'title slug excerpt featuredImage featuredImageAlt publishedAt readTime'
      )
      .sort({ publishedAt: -1 })
      .limit(3 - relatedPosts.length)
      .lean()
    relatedPosts = [...relatedPosts, ...morePosts]
  }

  return {
    blog: {
      ...b,
      id: b._id,
      category: category
        ? { ...(category as any), id: (category as any)._id }
        : null,
    },
    relatedPosts: relatedPosts.map((p: any) => ({ ...p, id: p._id })),
  }
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const { slug } = await params
  const data = await getBlogData(slug)

  if (!data) notFound()

  const { blog, relatedPosts } = data
  const publishedDate = new Date(blog.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const articleJsonLd =
    blog.jsonLd && Object.keys(blog.jsonLd).length > 0
      ? blog.jsonLd
      : {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: blog.title,
          description: blog.metaDescription || blog.excerpt,
          url: `${APP_URL}/blog/${slug}`,
          datePublished: blog.publishedAt,
          dateModified: blog.updatedAt,
          author: {
            '@type': 'Person',
            name: blog.author?.name,
          },
          publisher: {
            '@type': 'Organization',
            name: 'CRM Pro',
            url: APP_URL,
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${APP_URL}/blog/${slug}`,
          },
          wordCount: blog.wordCount,
          ...(blog.featuredImage
            ? {
                image: {
                  '@type': 'ImageObject',
                  url: blog.featuredImage,
                },
              }
            : {}),
          keywords: blog.metaKeywords?.join(', '),
        }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="mx-auto max-w-6xl px-5 py-12">
        <Breadcrumb
          items={[
            { label: 'Blog', href: '/blog' },
            ...(blog.category
              ? [
                  {
                    label: blog.category.name,
                    href: `/blog?category=${blog.category.slug}`,
                  },
                ]
              : []),
            { label: blog.title },
          ]}
        />

        <header className="mx-auto mb-10 max-w-3xl text-center">
          {blog.category && (
            <Link
              href={`/blog?category=${blog.category.slug}`}
              className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary"
            >
              {blog.category.name}
            </Link>
          )}

          <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
              {blog.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {blog.author && (
              <div className="flex items-center gap-2">
                {blog.author.avatar ? (
                  <Image
                    src={blog.author.avatar}
                    alt={blog.author.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {blog.author.name.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-foreground">
                  {blog.author.name}
                </span>
              </div>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <time dateTime={blog.publishedAt}>{publishedDate}</time>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {blog.readTime} min read
            </span>
            {blog.views > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {blog.views.toLocaleString()} views
              </span>
            )}
          </div>
        </header>

        {blog.featuredImage && (
          <div className="mx-auto mb-12 max-w-4xl overflow-hidden rounded-2xl">
            <Image
              src={blog.featuredImage}
              alt={blog.featuredImageAlt || blog.title}
              width={1200}
              height={630}
              className="h-auto w-full object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            />
          </div>
        )}

        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
          <div className="mx-auto max-w-3xl lg:mx-0">
            <BlogContent content={blog.content} />

            {blog.tags?.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {blog.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${tag}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
              <ShareButtons
                url={`${APP_URL}/blog/${slug}`}
                title={blog.title}
                description={blog.metaDescription || blog.excerpt}
              />
            </div>

            {blog.author?.bio && (
              <div className="mt-10 flex gap-4 rounded-xl border border-border bg-card p-6">
                {blog.author.avatar ? (
                  <Image
                    src={blog.author.avatar}
                    alt={blog.author.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {blog.author.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Written by</p>
                  <p className="font-semibold text-foreground">
                    {blog.author.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {blog.author.bio}
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents items={blog.tableOfContents || []} />
            </div>
          </aside>
        </div>

        <div className="mx-auto max-w-5xl">
          <RelatedPosts posts={relatedPosts} />
        </div>
      </article>
    </>
  )
}
