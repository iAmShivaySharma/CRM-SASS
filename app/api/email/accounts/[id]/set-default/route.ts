import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { EmailAccount } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    const accountId = params.id
    const workspaceId = auth.user.currentWorkspace

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    // Verify the account exists and belongs to the user
    const account = await EmailAccount.findOne({
      _id: accountId,
      userId: auth.user.id,
      workspaceId,
      isActive: true
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Use the static method to set as default
    await EmailAccount.setAsDefault(accountId, auth.user.id, workspaceId)

    log.info(`Email account set as default: ${account.emailAddress}`, {
      userId: auth.user.id,
      workspaceId,
      accountId
    })

    return NextResponse.json({
      success: true,
      message: 'Default account updated successfully'
    })
  } catch (error) {
    log.error('Set default email account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set default account' },
      { status: 500 }
    )
  }
}