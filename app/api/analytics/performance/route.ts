import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { MongoDBClient } from '@/lib/mongodb/client'
import { startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    const client = new MongoDBClient()

    // Default date range (last 30 days)
    const endDate = to ? new Date(to) : new Date()
    const startDate = from ? new Date(from) : subDays(endDate, 30)

    // Get leads for the workspace
    const leads = await client.getLeads(workspaceId)

    // Filter leads by date range
    const filteredLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt)
      return isWithinInterval(createdAt, { start: startDate, end: endDate })
    })

    // Calculate performance metrics
    const totalLeads = filteredLeads.length
    const convertedLeads = filteredLeads.filter(
      lead =>
        lead.status === 'converted' ||
        lead.status === 'closed' ||
        lead.status === 'won'
    )
    const lostLeads = filteredLeads.filter(
      lead => lead.status === 'lost' || lead.status === 'cancelled'
    )

    const totalRevenue = filteredLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    )
    const convertedRevenue = convertedLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    )

    // Win rate calculation
    const closedLeads = convertedLeads.length + lostLeads.length
    const winRate =
      closedLeads > 0 ? (convertedLeads.length / closedLeads) * 100 : 0

    // Average deal size
    const averageDealSize =
      convertedLeads.length > 0 ? convertedRevenue / convertedLeads.length : 0

    // Sales cycle length (mock calculation based on average days from creation to conversion)
    const salesCycleLength = convertedLeads.reduce((total, lead) => {
      const created = new Date(lead.createdAt)
      const updated = new Date(lead.updatedAt)
      const days = Math.ceil(
        (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      )
      return total + days
    }, 0)
    const averageSalesCycle =
      convertedLeads.length > 0 ? salesCycleLength / convertedLeads.length : 0

    // Sales target progress (assuming a monthly target)
    const monthlyTarget = 100000 // $100k monthly target - could be made configurable
    const salesTargetProgress = Math.min(
      (convertedRevenue / monthlyTarget) * 100,
      100
    )

    // Lead quality score (based on conversion rate and average deal size)
    const conversionRate =
      totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0
    const leadQualityScore = Math.min(
      conversionRate * 2 + averageDealSize / 1000,
      100
    )

    // Customer satisfaction (mock value - could be calculated from actual feedback data)
    const customerSatisfaction = 85 + Math.random() * 15

    const data = {
      salesTargetProgress: Math.round(salesTargetProgress * 10) / 10,
      leadQualityScore: Math.round(leadQualityScore * 10) / 10,
      customerSatisfaction: Math.round(customerSatisfaction * 10) / 10,
      averageDealSize: Math.round(averageDealSize * 100) / 100,
      salesCycleLength: Math.round(averageSalesCycle * 10) / 10,
      winRate: Math.round(winRate * 10) / 10,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Performance analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
