import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'

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

    const account = await WhatsAppAccount.findById(id)
    if (!account) {
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      )
    }

    if (body.displayName !== undefined) {
      account.displayName = body.displayName
    }
    if (body.name !== undefined) {
      account.displayName = body.name
    }
    if (body.phoneNumber !== undefined) {
      account.phoneNumber = body.phoneNumber
    }
    if (body.phoneNumberId !== undefined) {
      account.phoneNumberId = body.phoneNumberId
    }
    if (body.businessAccountId !== undefined) {
      account.businessAccountId = body.businessAccountId
    }
    if (body.accessToken !== undefined) {
      account.accessToken = body.accessToken
    }
    if (body.webhookVerifyToken !== undefined) {
      account.webhookVerifyToken = body.webhookVerifyToken
    }
    if (body.isActive !== undefined) {
      account.isActive = body.isActive
    }
    if (body.botEnabled !== undefined) {
      account.botEnabled = body.botEnabled
    }
    if (body.botContext !== undefined) {
      account.botContext = body.botContext
    }
    if (body.botTone !== undefined) {
      account.botTone = body.botTone
    }

    await account.save()

    return NextResponse.json({ success: true, account })
  } catch {
    return NextResponse.json(
      { message: 'Failed to update account' },
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
    await WhatsAppAccount.findByIdAndUpdate(id, { isActive: false })

    return NextResponse.json({ success: true, message: 'Account disconnected' })
  } catch {
    return NextResponse.json(
      { message: 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
