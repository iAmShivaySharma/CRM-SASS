import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailService } from '@/lib/services/emailProviderService'
import { log } from '@/lib/logging/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    const resolvedParams = await params
    const accountId = resolvedParams.id
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const result = await EmailService.testAccountConnection(accountId)

    if (!result.success) {
      log.warn(`Email account connection test failed: ${accountId}`, {
        userId: auth.user.id,
        workspaceId,
        accountId,
        error: result.error
      })

      return NextResponse.json({
        success: false,
        error: result.error || 'Connection test failed'
      })
    }

    log.info(`Email account connection test successful: ${accountId}`, {
      userId: auth.user.id,
      workspaceId,
      accountId
    })

    return NextResponse.json({
      success: true,
      message: 'Connection test successful'
    })
  } catch (error) {
    log.error('Test email account connection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection test failed' },
      { status: 500 }
    )
  }
}