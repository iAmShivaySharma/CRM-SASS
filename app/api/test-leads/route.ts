import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Lead, WorkspaceMember } from '@/lib/mongodb/client'
import { verifyAuthToken } from '@/lib/mongodb/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting test-leads API...')

    // Connect to MongoDB
    await connectToMongoDB()
    console.log('Connected to MongoDB')

    // Verify auth
    const auth = await verifyAuthToken(request)
    console.log('Auth result:', auth ? 'Success' : 'Failed')

    if (!auth) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 })
    }

    // Get workspace ID
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')
    console.log('Workspace ID:', workspaceId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace ID' }, { status: 400 })
    }

    // Check workspace membership
    console.log('Checking workspace membership...')
    const member = await WorkspaceMember.findOne({
      userId: auth.user.id,
      workspaceId,
      status: 'active',
    })
    console.log('Member found:', !!member)

    if (!member) {
      return NextResponse.json(
        { error: 'No workspace access' },
        { status: 403 }
      )
    }

    // Try to get leads count
    console.log('Getting leads count...')
    const leadsCount = await Lead.countDocuments({ workspaceId })
    console.log('Leads count:', leadsCount)

    // Try to get first few leads
    console.log('Getting leads...')
    const leads = await Lead.find({ workspaceId }).limit(5).lean()
    console.log('Leads found:', leads.length)

    return NextResponse.json({
      success: true,
      debug: {
        auth: !!auth,
        workspaceId,
        member: !!member,
        leadsCount,
        leadsFound: leads.length,
        firstLead: leads[0] || null,
      },
    })
  } catch (error) {
    console.error('Test leads error:', error)
    return NextResponse.json(
      {
        error: 'Internal error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
