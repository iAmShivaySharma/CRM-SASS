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

    // Get leads
    const leads = await client.getLeads(workspaceId)

    // Filter leads by date range
    const filteredLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt)
      return isWithinInterval(createdAt, { start: startDate, end: endDate })
    })

    // Group leads by status
    const statusGroups = new Map<string, { leads: any[]; totalValue: number }>()

    // Group filtered leads
    filteredLeads.forEach(lead => {
      const statusName = typeof lead.status === 'string' ? lead.status : 'new' // default status

      if (!statusGroups.has(statusName)) {
        statusGroups.set(statusName, { leads: [], totalValue: 0 })
      }

      const group = statusGroups.get(statusName)!
      group.leads.push(lead)
      group.totalValue += lead.value || 0
    })

    const totalLeads = filteredLeads.length
    const totalValue = filteredLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    )

    // Convert to pipeline analytics format
    const pipelineData = Array.from(statusGroups.entries())
      .filter(([_, group]) => group.leads.length > 0) // Only include statuses with leads
      .map(([statusName, group]) => ({
        statusName,
        count: group.leads.length,
        percentage:
          totalLeads > 0 ? (group.leads.length / totalLeads) * 100 : 0,
        value: group.totalValue,
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    return NextResponse.json({
      success: true,
      data: pipelineData,
    })
  } catch (error) {
    console.error('Pipeline analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
