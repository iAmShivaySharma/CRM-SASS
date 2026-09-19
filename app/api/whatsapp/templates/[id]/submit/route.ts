import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WhatsAppService } from '@/lib/services/whatsappService'

export async function POST(
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
    const result = await WhatsAppService.submitTemplateToMeta({
      accountId: '',
      templateId: id,
    })

    return NextResponse.json({
      success: true,
      metaTemplateId: result.metaTemplateId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to submit template to Meta' },
      { status: 500 }
    )
  }
}
