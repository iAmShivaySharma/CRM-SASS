import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import ExcelJS from 'exceljs'

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

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Leads')

    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map(key => ({
        header: key,
        key,
        width: 20,
      }))
      rows.forEach(row => worksheet.addRow(row))
    }

    if (format === 'csv') {
      const csvBuffer = await workbook.csv.writeBuffer()
      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
        },
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()

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
