import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailAccount } from '@/lib/mongodb/models'
import { EmailService } from '@/lib/services/emailProviderService'
import { log } from '@/lib/logging/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    const accountId = params.id
    const workspaceId = auth.user.currentWorkspace
    const body = await request.json()

    const account = await EmailAccount.findOne({
      _id: accountId,
      userId: auth.user.id,
      workspaceId,
      isActive: true
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!account.settings.syncEnabled) {
      return NextResponse.json(
        { error: 'Sync is disabled for this account' },
        { status: 400 }
      )
    }

    // Extract sync options from request
    const {
      folder = 'INBOX',
      since,
      limit = 50,
      markAsRead = false
    } = body

    const syncOptions = {
      folder,
      since: since ? new Date(since) : undefined,
      limit,
      markAsRead
    }

    // Perform the sync
    const result = await EmailService.syncAccountEmails(accountId, syncOptions)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      )
    }

    // Update last sync time
    account.settings.lastSyncAt = new Date()
    await account.save()

    log.info(`Email sync completed for account: ${account.emailAddress}`, {
      userId: auth.user.id,
      workspaceId,
      accountId,
      syncedCount: result.count,
      folder,
      syncOptions
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Synced ${result.count} new emails`,
      lastSyncAt: account.settings.lastSyncAt
    })
  } catch (error) {
    log.error('Email sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync emails' },
      { status: 500 }
    )
  }
}