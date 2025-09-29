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
    const compareFrom = searchParams.get('compareFrom')
    const compareTo = searchParams.get('compareTo')

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

    // Comparison period (previous 30 days)
    const compareEndDate = compareTo
      ? new Date(compareTo)
      : subDays(startDate, 1)
    const compareStartDate = compareFrom
      ? new Date(compareFrom)
      : subDays(compareEndDate, 30)

    // Get all leads for the workspace
    const leads = await client.getLeads(workspaceId)

    // Filter leads by date range
    const currentPeriodLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt)
      return isWithinInterval(createdAt, { start: startDate, end: endDate })
    })

    const previousPeriodLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt)
      return isWithinInterval(createdAt, {
        start: compareStartDate,
        end: compareEndDate,
      })
    })

    // Calculate metrics for current period
    const totalLeads = currentPeriodLeads.length
    const convertedLeads = currentPeriodLeads.filter(
      lead =>
        lead.status === 'converted' ||
        lead.status === 'closed' ||
        lead.status === 'won'
    ).length
    const conversionRate =
      totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    const totalRevenue = currentPeriodLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    )

    // Calculate metrics for previous period
    const totalLeadsPrevious = previousPeriodLeads.length
    const convertedLeadsPrevious = previousPeriodLeads.filter(
      lead =>
        lead.status === 'converted' ||
        lead.status === 'closed' ||
        lead.status === 'won'
    ).length
    const conversionRatePrevious =
      totalLeadsPrevious > 0
        ? (convertedLeadsPrevious / totalLeadsPrevious) * 100
        : 0
    const totalRevenuePrevious = previousPeriodLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    )

    // Calculate growth metrics
    const leadsGrowth =
      totalLeadsPrevious > 0
        ? ((totalLeads - totalLeadsPrevious) / totalLeadsPrevious) * 100
        : 0
    const revenueGrowth =
      totalRevenuePrevious > 0
        ? ((totalRevenue - totalRevenuePrevious) / totalRevenuePrevious) * 100
        : 0
    const growth = (leadsGrowth + revenueGrowth) / 2

    // Quick stats (current period specific calculations)
    const activeDeals = currentPeriodLeads.filter(
      lead =>
        !['converted', 'closed', 'won', 'lost', 'cancelled'].includes(
          lead.status
        )
    ).length

    // Monthly revenue (last 30 days)
    const monthlyRevenue = currentPeriodLeads
      .filter(lead => {
        const createdAt = new Date(lead.createdAt)
        return isWithinInterval(createdAt, {
          start: subDays(new Date(), 30),
          end: new Date(),
        })
      })
      .reduce((sum, lead) => sum + (lead.value || 0), 0)

    // New leads (last 7 days)
    const newLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt)
      return isWithinInterval(createdAt, {
        start: subDays(new Date(), 7),
        end: new Date(),
      })
    }).length

    // Performance metrics (mock values - can be calculated based on actual data)
    const salesTargetProgress = Math.min((totalRevenue / 100000) * 100, 100) // Assuming $100k target
    const leadQualityScore = Math.min(conversionRate * 3.5, 100) // Based on conversion rate
    const customerSatisfaction = 85 + Math.random() * 15 // Mock value between 85-100

    const data = {
      totalLeads,
      totalLeadsPrevious,
      conversionRate,
      conversionRatePrevious,
      totalRevenue,
      totalRevenuePrevious,
      growth,
      growthPrevious: 0, // Could calculate from even earlier period

      // Quick stats
      activeDeals,
      monthlyRevenue,
      newLeads,

      // Performance metrics
      salesTargetProgress,
      leadQualityScore,
      customerSatisfaction,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
