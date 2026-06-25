import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Blog } from '@/lib/mongodb/models/Blog'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'
import { verifyAuthToken } from '@/lib/mongodb/auth'

const updateBlogSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(300).optional(),
  featuredImage: z.string().optional(),
  featuredImageAlt: z.string().max(200).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z
    .object({
      name: z.string().min(1),
      avatar: z.string().optional(),
      bio: z.string().optional(),
    })
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().optional(),
  twitterTitle: z.string().max(70).optional(),
  twitterDescription: z.string().max(200).optional(),
  twitterImage: z.string().optional(),
  priority: z.number().min(0).max(1).optional(),
  changeFrequency: z
    .enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])
    .optional(),
  isFeatured: z.boolean().optional(),
  relatedSlugs: z.array(z.string()).optional(),
  tableOfContents: z
    .array(z.object({ id: z.string(), text: z.string(), level: z.number() }))
    .optional(),
})

// GET /api/blogs/[slug] - Get single blog post (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToMongoDB()
    const { slug } = await params

    const blog = await Blog.findOne({ slug, status: 'published' }).lean()
    if (!blog) {
      return NextResponse.json(
        { message: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Increment views (fire-and-forget)
    Blog.updateOne({ slug }, { $inc: { views: 1 } }).exec()

    const category = await BlogCategory.findById((blog as any).categoryId)
      .select('name slug')
      .lean()

    // Fetch related posts
    let relatedPosts: any[] = []
    if ((blog as any).relatedSlugs?.length > 0) {
      relatedPosts = await Blog.find({
        slug: { $in: (blog as any).relatedSlugs },
        status: 'published',
      })
        .select(
          'title slug excerpt featuredImage featuredImageAlt publishedAt readTime'
        )
        .lean()
    }

    // If not enough related posts, fill with same category
    if (relatedPosts.length < 3) {
      const morePosts = await Blog.find({
        categoryId: (blog as any).categoryId,
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

    const response = NextResponse.json({
      blog: { ...(blog as any), id: (blog as any)._id, category },
      relatedPosts: relatedPosts.map((p: any) => ({ ...p, id: p._id })),
    })

    // Cache individual blog post for 10 minutes, stale-while-revalidate for 1 hour
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=3600'
    )

    return response
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch blog' },
      { status: 500 }
    )
  }
}

// PUT /api/blogs/[slug] - Update blog post (authenticated)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { slug } = await params
    const body = await request.json()
    const validation = updateBlogSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    const blog = await Blog.findOne({ slug })
    if (!blog) {
      return NextResponse.json(
        { message: 'Blog post not found' },
        { status: 404 }
      )
    }

    // If slug is being changed, check uniqueness
    if (validation.data.slug && validation.data.slug !== slug) {
      const existing = await Blog.findOne({ slug: validation.data.slug })
      if (existing) {
        return NextResponse.json(
          { message: 'A blog post with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Handle category change
    if (
      validation.data.categoryId &&
      validation.data.categoryId !== blog.categoryId
    ) {
      await Promise.all([
        BlogCategory.findByIdAndUpdate(blog.categoryId, {
          $inc: { postCount: -1 },
        }),
        BlogCategory.findByIdAndUpdate(validation.data.categoryId, {
          $inc: { postCount: 1 },
        }),
      ])
    }

    Object.assign(blog, validation.data)
    await blog.save()

    return NextResponse.json({ blog })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update blog' },
      { status: 500 }
    )
  }
}

// DELETE /api/blogs/[slug] - Delete blog post (authenticated)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { slug } = await params
    const blog = await Blog.findOne({ slug })
    if (!blog) {
      return NextResponse.json(
        { message: 'Blog post not found' },
        { status: 404 }
      )
    }

    await BlogCategory.findByIdAndUpdate(blog.categoryId, {
      $inc: { postCount: -1 },
    })

    await Blog.deleteOne({ slug })

    return NextResponse.json({ message: 'Blog post deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete blog' },
      { status: 500 }
    )
  }
}
