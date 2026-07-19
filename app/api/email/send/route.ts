export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { EmailService } from '@/lib/services/emailProviderService'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const workspaceId = new URL(request.url).searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 }
      )
    }

    let accountId: string | null = null
    let to: string | null = null
    let cc: string | null = null
    let bcc: string | null = null
    let subject: string | null = null
    let text: string | undefined
    let html: string | undefined
    let attachments: any[] | undefined
    let replyTo: string | undefined
    let inReplyTo: string | undefined
    let references: string[] | undefined

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      accountId = formData.get('accountId') as string
      to = formData.get('to') as string
      cc = (formData.get('cc') as string) || null
      bcc = (formData.get('bcc') as string) || null
      subject = formData.get('subject') as string
      const body = formData.get('body') as string
      html = body || undefined
      text = body || undefined
      inReplyTo = (formData.get('inReplyTo') as string) || undefined

      const files = formData.getAll('attachments')
      if (files.length > 0) {
        attachments = await Promise.all(
          files
            .filter(f => f instanceof File)
            .map(async file => {
              const f = file as File
              const buffer = Buffer.from(await f.arrayBuffer())
              return {
                filename: f.name,
                content: buffer,
                contentType: f.type,
              }
            })
        )
      }
    } else {
      const body = await request.json()
      accountId = body.accountId
      to = body.to
      cc = body.cc
      bcc = body.bcc
      subject = body.subject
      text = body.text
      html = body.html
      attachments = body.attachments
      replyTo = body.replyTo
      inReplyTo = body.inReplyTo
      references = body.references
    }

    if (!accountId || !to || !subject) {
      return NextResponse.json(
        { error: 'Account ID, recipient, and subject are required' },
        { status: 400 }
      )
    }

    if (!text && !html) {
      return NextResponse.json(
        { error: 'Either text or HTML content is required' },
        { status: 400 }
      )
    }

    const result = await EmailService.sendEmail(accountId, {
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text,
      html,
      attachments,
      replyTo,
      inReplyTo,
      references,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 400 }
      )
    }

    log.info(`Email sent successfully`, {
      userId: auth.user.id,
      workspaceId,
      accountId,
      messageId: result.messageId,
      subject,
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully',
    })
  } catch (error) {
    log.error('Send email error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    )
  }
}
