import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { PushSubscription } from '@/lib/mongodb/models/PushSubscription'

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

    const { subscription, workspaceId } = await request.json()

    if (!subscription?.endpoint || !subscription?.keys || !workspaceId) {
      return NextResponse.json(
        { message: 'subscription and workspaceId are required' },
        { status: 400 }
      )
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: auth.user.id,
        workspaceId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: request.headers.get('user-agent') || undefined,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to save subscription' },
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

    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json(
        { message: 'endpoint is required' },
        { status: 400 }
      )
    }

    await PushSubscription.findOneAndDelete({
      endpoint,
      userId: auth.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}
