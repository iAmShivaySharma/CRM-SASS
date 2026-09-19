import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WhatsAppService } from '@/lib/services/whatsappService'

const syncSchema = z.object({
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
})

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
    const parsed = syncSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'workspaceId and accountId are required' },
        { status: 400 }
      )
    }

    const result = await WhatsAppService.syncTemplatesFromMeta({
      workspaceId: parsed.data.workspaceId,
      accountId: parsed.data.accountId,
    })

    return NextResponse.json({ success: true, synced: result.synced })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to sync templates' },
      { status: 500 }
    )
  }
}
