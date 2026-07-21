import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const format = searchParams.get('format') || 'xlsx'

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.view'
    )
    if (permError) return permError

    const leads = await Lead.find({ workspaceId })
      .populate('statusId', 'name')
      .populate('tagIds', 'name')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 })
      .lean()

    const rows = leads.map(lead => ({
      Name: lead.name || '',
      Email: lead.email || '',
      Phone: lead.phone || '',
      Company: lead.company || '',
      Status:
        typeof lead.statusId === 'object' && lead.statusId
          ? (lead.statusId as any).name
          : lead.status || '',
      Source: lead.source || '',
      Priority: lead.priority || '',
      Value: lead.value || 0,
      'Assigned To':
        typeof lead.assignedTo === 'object' && lead.assignedTo
          ? (lead.assignedTo as any).fullName
          : '',
      Tags: Array.isArray(lead.tagIds)
        ? lead.tagIds
            .map((t: any) => (typeof t === 'object' ? t.name : t))
            .join(', ')
        : '',
      Notes: lead.notes || '',
      'Created At': lead.createdAt
        ? new Date(lead.createdAt).toISOString().split('T')[0]
        : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')

    const colWidths = [
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
      { wch: 25 },
      { wch: 40 },
      { wch: 12 },
    ]
    worksheet['!cols'] = colWidths

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
        },
      })
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leads-${Date.now()}.xlsx"`,
      },
    })
  } catch (error) {
    log.error('Export leads error:', error)
    return NextResponse.json(
      { error: 'Failed to export leads' },
      { status: 500 }
    )
  }
}
