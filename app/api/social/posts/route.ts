import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { SocialPost } from '@/lib/mongodb/models/SocialPost'

const platformEntrySchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'linkedin', 'twitter']),
  accountId: z.string().min(1),
  customContent: z.string().optional(),
})

const createSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string()).optional(),
  platforms: z.array(platformEntrySchema).min(1),
  scheduledAt: z.string().optional(),
  status: z
    .enum(['draft', 'scheduled', 'publishing', 'published', 'failed'])
    .optional(),
  aiGenerated: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const filter: any = { workspaceId }
    if (status) {
      filter.status = status
    }

    const total = await SocialPost.countDocuments(filter)
    const totalPages = Math.ceil(total / limit)

    const posts = await SocialPost.find(filter)
      .sort({ scheduledAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const sanitized = posts.map((p: any) => {
      const obj = { ...p, id: p._id }
      delete obj._id
      delete obj.__v
      return obj
    })

    return NextResponse.json({
      success: true,
      posts: sanitized,
      total,
      page,
      totalPages,
    })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

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
    const validation = createSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    let postStatus = data.status || 'draft'
    if (data.scheduledAt && !data.status) {
      postStatus = 'scheduled'
    }

    const platformEntries = data.platforms.map(p => ({
      ...p,
      status: postStatus,
    }))

    const post = await SocialPost.create({
      workspaceId: data.workspaceId,
      content: data.content,
      mediaUrls: data.mediaUrls || [],
      platforms: platformEntries,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      status: postStatus,
      aiGenerated: data.aiGenerated || false,
      createdBy: auth.user.id,
    })

    return NextResponse.json(
      { success: true, post: post.toJSON() },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { message: 'Failed to create post' },
      { status: 500 }
    )
  }
}
