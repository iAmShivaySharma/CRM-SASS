import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { EmailAccount } from '@/lib/mongodb/models'
import { EmailProviderFactory } from '@/lib/services/emailProviderService'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const accountId = searchParams.get('accountId')

    if (!workspaceId || !accountId) {
      return NextResponse.json(
        { error: 'workspaceId and accountId are required' },
        { status: 400 }
      )
    }

    const account = await EmailAccount.findOne({
      _id: accountId,
      userId: auth.user._id,
      workspaceId,
      isActive: true
    }).select('+oauthAccessToken +oauthRefreshToken')

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const provider = await EmailProviderFactory.createProvider(account)
    const result = await provider.getFolders()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch folders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      folders: result.folders
    })
  } catch (error) {
    log.error('Get email folders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}
