import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Blog } from '@/lib/mongodb/models/Blog'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { z } from 'zod'

const createBlogSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(1),
  excerpt: z.string().max(300).optional(),
  featuredImage: z.string().optional(),
  featuredImageAlt: z.string().max(200).optional(),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  author: z.object({
    name: z.string().min(1),
    avatar: z.string().optional(),
    bio: z.string().optional(),
  }),
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

// GET /api/blogs - Public listing with pagination, filtering, caching
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12')))
    const category = url.searchParams.get('category')
    const tag = url.searchParams.get('tag')
    const search = url.searchParams.get('search')
    const featured = url.searchParams.get('featured')
    const status = url.searchParams.get('status') || 'published'

    const query: Record<string, any> = { status }

    if (category) {
      const cat = await BlogCategory.findOne({ slug: category, isActive: true })
      if (cat) query.categoryId = cat._id
    }

    if (tag) query.tags = tag.toLowerCase()
    if (featured === 'true') query.isFeatured = true

    if (search) {
      query.$text = { $search: search }
    }

    const skip = (page - 1) * limit

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select('-content -jsonLd')
        .sort(search ? { score: { $meta: 'textScore' } } : { publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query),
    ])

    // Populate category names
    const categoryIds = [...new Set(blogs.map((b: any) => b.categoryId))]
    const categories = await BlogCategory.find({ _id: { $in: categoryIds } })
      .select('name slug')
      .lean()
    const categoryMap = new Map(categories.map((c: any) => [c._id, c]))

    const enrichedBlogs = blogs.map((blog: any) => ({
      ...blog,
      id: blog._id,
      category: categoryMap.get(blog.categoryId) || null,
    }))

    const totalPages = Math.ceil(total / limit)

    const response = NextResponse.json({
      blogs: enrichedBlogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

    // Cache public blog listing for 5 minutes, stale-while-revalidate for 1 hour
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    )

    return response
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return NextResponse.json(
      { message: 'Failed to fetch blogs' },
      { status: 500 }
    )
  }
}

// POST /api/blogs - Create blog (authenticated)
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createBlogSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existing = await Blog.findOne({ slug: validation.data.slug })
    if (existing) {
      return NextResponse.json(
        { message: 'A blog post with this slug already exists' },
        { status: 409 }
      )
    }

    // Verify category exists
    const category = await BlogCategory.findById(validation.data.categoryId)
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      )
    }

    const blog = await Blog.create(validation.data)

    // Increment category post count
    await BlogCategory.findByIdAndUpdate(validation.data.categoryId, {
      $inc: { postCount: 1 },
    })

    return NextResponse.json({ blog }, { status: 201 })
  } catch (error) {
    console.error('Error creating blog:', error)
    return NextResponse.json(
      { message: 'Failed to create blog' },
      { status: 500 }
    )
  }
}
