import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { SocialAccount } from '@/lib/mongodb/models/SocialAccount'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  platform: z.enum(['facebook', 'instagram', 'linkedin', 'twitter']),
  accountName: z.string().min(1).max(100),
  accountId: z.string().min(1),
  accessToken: z.string().min(1),
  profileUrl: z.string().url().optional().or(z.literal('')),
  profileImage: z.string().url().optional().or(z.literal('')),
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

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const accounts = await SocialAccount.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean()

    const sanitized = accounts.map((a: any) => {
      const obj = { ...a, id: a._id }
      delete obj._id
      delete obj.__v
      delete obj.accessToken
      delete obj.refreshToken
      return obj
    })

    return NextResponse.json({ success: true, accounts: sanitized })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch social accounts' },
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

    const existing = await SocialAccount.findOne({
      workspaceId: data.workspaceId,
      accountId: data.accountId,
    })

    if (existing) {
      return NextResponse.json(
        { message: 'This account is already connected' },
        { status: 409 }
      )
    }

    const account = await SocialAccount.create({
      ...data,
      profileUrl: data.profileUrl || undefined,
      profileImage: data.profileImage || undefined,
      createdBy: auth.user.id,
    })

    return NextResponse.json(
      { success: true, account: account.toJSON() },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { message: 'Failed to connect social account' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 }
      )
    }

    await SocialAccount.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Account disconnected' })
  } catch {
    return NextResponse.json(
      { message: 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
