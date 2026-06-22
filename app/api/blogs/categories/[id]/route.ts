import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { BlogCategory } from '@/lib/mongodb/models/BlogCategory'
import { Blog } from '@/lib/mongodb/models/Blog'
import { verifyAuthToken } from '@/lib/mongodb/auth'

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(500).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/blogs/categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const body = await request.json()
    const validation = updateCategorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    const category = await BlogCategory.findByIdAndUpdate(id, validation.data, {
      new: true,
    })
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { message: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/blogs/categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    // Check if any blogs use this category
    const blogCount = await Blog.countDocuments({ categoryId: id })
    if (blogCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete: ${blogCount} blog post(s) use this category. Reassign them first.`,
        },
        { status: 400 }
      )
    }

    const category = await BlogCategory.findByIdAndDelete(id)
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Category deleted' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { message: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
