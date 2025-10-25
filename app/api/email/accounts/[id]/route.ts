import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { EmailAccount, EmailMessage } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: accountId } = await params
    const workspaceId = auth.user.currentWorkspace

    const account = await EmailAccount.findOne({
      _id: accountId,
      userId: auth.user._id,
      workspaceId,
      isActive: true
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({
      account: {
        _id: account._id,
        provider: account.provider,
        displayName: account.displayName,
        emailAddress: account.emailAddress,
        isActive: account.isActive,
        isDefault: account.isDefault,
        connectionStatus: account.connectionStatus,
        stats: account.stats,
        settings: account.settings
      }
    })
  } catch (error) {
    log.error('Get email account error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email account' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: accountId } = await params
    const body = await request.json()
    const workspaceId = auth.user.currentWorkspace

    const account = await EmailAccount.findOne({
      _id: accountId,
      userId: auth.user._id,
      workspaceId,
      isActive: true
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const {
      displayName,
      settings,
      smtpConfig,
      imapConfig
    } = body

    // Update basic fields
    if (displayName) account.displayName = displayName
    if (settings) {
      account.settings = { ...account.settings, ...settings }
    }

    // Update SMTP config
    if (smtpConfig) {
      account.smtpConfig = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure
      }
      if (smtpConfig.username && smtpConfig.password) {
        account.setSmtpCredentials(smtpConfig.username, smtpConfig.password)
      }
    }

    // Update IMAP config
    if (imapConfig) {
      account.imapConfig = {
        host: imapConfig.host,
        port: imapConfig.port,
        secure: imapConfig.secure
      }
      if (imapConfig.username && imapConfig.password) {
        account.setImapCredentials(imapConfig.username, imapConfig.password)
      }
    }

    await account.save()

    log.info(`Email account updated: ${account.emailAddress}`, {
      userId: auth.user._id,
      workspaceId,
      accountId
    })

    return NextResponse.json({
      success: true,
      message: 'Email account updated successfully'
    })
  } catch (error) {
    log.error('Update email account error:', error)
    return NextResponse.json(
      { error: 'Failed to update email account' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: accountId } = await params
    const workspaceId = auth.user.currentWorkspace

    const account = await EmailAccount.findOne({
      _id: accountId,
      userId: auth.user._id,
      workspaceId,
      isActive: true
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Soft delete the account
    account.isActive = false
    await account.save()

    // Also soft delete all associated emails
    await EmailMessage.updateMany(
      { emailAccountId: accountId },
      { syncStatus: 'ignored' }
    )

    log.info(`Email account deleted: ${account.emailAddress}`, {
      userId: auth.user._id,
      workspaceId,
      accountId
    })

    return NextResponse.json({
      success: true,
      message: 'Email account deleted successfully'
    })
  } catch (error) {
    log.error('Delete email account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete email account' },
      { status: 500 }
    )
  }
}