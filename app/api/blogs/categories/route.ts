import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(500).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  parentId: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/blogs/categories - Public listing
export async function GET() {
  try {
    await connectToMongoDB()

    const categories = await BlogCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()

    const response = NextResponse.json({
      categories: categories.map((c: any) => ({ ...c, id: c._id })),
    })

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=3600'
    )

    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { message: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/blogs/categories - Create category (authenticated)
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
    const validation = categorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    const existing = await BlogCategory.findOne({ slug: validation.data.slug })
    if (existing) {
      return NextResponse.json(
        { message: 'A category with this slug already exists' },
        { status: 409 }
      )
    }

    const category = await BlogCategory.create(validation.data)

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { message: 'Failed to create category' },
      { status: 500 }
    )
  }
}
