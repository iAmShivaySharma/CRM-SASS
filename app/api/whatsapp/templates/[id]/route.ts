import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WhatsAppTemplate } from '@/lib/mongodb/models/WhatsAppTemplate'
import { WhatsAppService } from '@/lib/services/whatsappService'

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
    const template = await WhatsAppTemplate.findById(id).lean()
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, template })
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch template' },
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
    await WhatsAppService.deleteTemplateFromMeta({ templateId: id })

    return NextResponse.json({ success: true, message: 'Template deleted' })
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}
