import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailService } from '@/lib/services/emailProviderService'
import { log } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json()
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const {
      accountId,
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments,
      replyTo,
      inReplyTo,
      references
    } = body

    // Validate required fields
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
      cc,
      bcc,
      subject,
      text,
      html,
      attachments,
      replyTo,
      inReplyTo,
      references
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
      subject
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    })
  } catch (error) {
    log.error('Send email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}