import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import { calculateLeadScore } from '@/lib/services/leadScoringService'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { workspaceId, leadIds } = await request.json()

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.edit'
    )
    if (permError) return permError

    const query: any = { workspaceId }
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds }
    }

    const leads = await Lead.find(query).lean()

    let scored = 0
    for (const lead of leads) {
      const result = calculateLeadScore(lead as any)

      await Lead.findByIdAndUpdate(lead._id, {
        leadScore: result.score,
        leadScoreFactors: result.factors,
        priority: result.priority,
      })

      scored++
    }

    return NextResponse.json({
      success: true,
      scored,
      message: `Scored ${scored} leads`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to score leads' },
      { status: 500 }
    )
  }
}
