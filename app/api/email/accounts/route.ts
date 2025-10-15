import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailAccount } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const accounts = await EmailAccount.find({
      userId: auth.user.id,
      workspaceId,
      isActive: true
    }).sort({ isDefault: -1, createdAt: -1 })

    return NextResponse.json({
      accounts: accounts.map(account => ({
        _id: account._id,
        provider: account.provider,
        displayName: account.displayName,
        emailAddress: account.emailAddress,
        isActive: account.isActive,
        isDefault: account.isDefault,
        connectionStatus: account.connectionStatus,
        stats: account.stats,
        settings: {
          syncEnabled: account.settings.syncEnabled,
          syncInterval: account.settings.syncInterval,
          lastSyncAt: account.settings.lastSyncAt
        }
      }))
    })
  } catch (error) {
    log.error('Get email accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json()
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const {
      provider,
      displayName,
      emailAddress,
      smtpConfig,
      imapConfig,
      settings = {}
    } = body

    // Validate required fields
    if (!provider || !displayName || !emailAddress) {
      return NextResponse.json(
        { error: 'Provider, display name, and email address are required' },
        { status: 400 }
      )
    }

    // Check if email already exists for this workspace
    const existingAccount = await EmailAccount.findOne({
      emailAddress,
      workspaceId,
      isActive: true
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'This email address is already connected to this workspace' },
        { status: 400 }
      )
    }

    // Check if this is the first account (make it default)
    const accountCount = await EmailAccount.countDocuments({
      userId: auth.user.id,
      workspaceId,
      isActive: true
    })

    const isFirstAccount = accountCount === 0

    // Create new email account
    const account = new EmailAccount({
      userId: auth.user.id,
      workspaceId,
      provider,
      displayName,
      emailAddress,
      isActive: true,
      isDefault: isFirstAccount,
      settings: {
        syncEnabled: settings.syncEnabled ?? true,
        syncInterval: settings.syncInterval ?? 15,
        signature: settings.signature || '',
        folders: {
          inbox: 'INBOX',
          sent: 'INBOX.Sent',
          drafts: 'INBOX.Drafts',
          trash: 'INBOX.Trash'
        }
      }
    })

    // Set credentials based on provider
    if (provider === 'smtp' && smtpConfig) {
      account.smtpConfig = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure
      }
      account.setSmtpCredentials(smtpConfig.username, smtpConfig.password)
    }

    if (provider === 'imap' && imapConfig) {
      account.imapConfig = {
        host: imapConfig.host,
        port: imapConfig.port,
        secure: imapConfig.secure
      }
      account.setImapCredentials(imapConfig.username, imapConfig.password)
    }

    await account.save()

    log.info(`Email account created: ${emailAddress}`, {
      userId: auth.user.id,
      workspaceId,
      provider,
      accountId: account._id
    })

    return NextResponse.json({
      success: true,
      accountId: account._id,
      message: 'Email account created successfully'
    })
  } catch (error) {
    log.error('Create email account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create email account' },
      { status: 500 }
    )
  }
}