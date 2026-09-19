import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { SocialPost } from '@/lib/mongodb/models/SocialPost'

export async function GET(
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

    const post = await SocialPost.findById(id).lean()
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    const obj: any = { ...post, id: (post as any)._id }
    delete obj._id
    delete obj.__v

    return NextResponse.json({ success: true, post: obj })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

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

    const post = await SocialPost.findById(id)
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    if (body.content !== undefined) {
      post.content = body.content
    }
    if (body.mediaUrls !== undefined) {
      post.mediaUrls = body.mediaUrls
    }
    if (body.platforms !== undefined) {
      post.platforms = body.platforms
    }
    if (body.scheduledAt !== undefined) {
      post.scheduledAt = body.scheduledAt
        ? new Date(body.scheduledAt)
        : undefined
    }
    if (body.status !== undefined) {
      post.status = body.status
      if (body.status === 'scheduled' || body.status === 'draft') {
        post.platforms = post.platforms.map((p: any) => ({
          ...(p.toObject ? p.toObject() : p),
          status: body.status,
        }))
      }
    }

    await post.save()

    return NextResponse.json({ success: true, post: post.toJSON() })
  } catch {
    return NextResponse.json(
      { message: 'Failed to update post' },
      { status: 500 }
    )
  }
}

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

    await SocialPost.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Post deleted' })
  } catch {
    return NextResponse.json(
      { message: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
