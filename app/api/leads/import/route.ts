import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead, LeadStatus, Tag } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import ExcelJS from 'exceljs'

const VALID_SOURCES = [
  'manual',
  'website',
  'referral',
  'social',
  'social_media',
  'email',
  'phone',
  'other',
]
const VALID_PRIORITIES = ['low', 'medium', 'high']

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const workspaceId = formData.get('workspaceId') as string

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: 'File and workspaceId are required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.create'
    )
    if (permError) return permError

    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(arrayBuffer))
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json(
        { error: 'No worksheet found in file' },
        { status: 400 }
      )
    }
    const headers: string[] = []
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '')
    })
    const rows: any[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const obj: any = {}
      row.eachCell((cell, colNumber) => {
        const key = headers[colNumber - 1]
        if (key) obj[key] = cell.value
      })
      rows.push(obj)
    })

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or has no valid data' },
        { status: 400 }
      )
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { error: 'Cannot import more than 1000 leads at once' },
        { status: 400 }
      )
    }

    const statuses = await LeadStatus.find({ workspaceId }).lean()
    const statusMap = new Map(
      statuses.map((s: any) => [
        (s.name as string).toLowerCase(),
        s._id.toString(),
      ])
    )
    const defaultStatus = statuses.find((s: any) => s.isDefault)

    const defaultTag = await Tag.findOne({
      workspaceId,
      name: 'Cold Lead',
    }).lean()

    const errors: string[] = []
    const leadsToCreate: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      const name = row.Name || row.name || row['Full Name'] || row['full name']
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push(`Row ${rowNum}: Name is required`)
        continue
      }

      const email = row.Email || row.email || ''
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Row ${rowNum}: Invalid email "${email}"`)
        continue
      }

      const source = (row.Source || row.source || 'manual').toLowerCase()

      const priority = (row.Priority || row.priority || 'medium').toLowerCase()

      const statusName = (row.Status || row.status || '')
        .toString()
        .toLowerCase()
      const statusId =
        statusMap.get(statusName) || defaultStatus?._id?.toString()

      leadsToCreate.push({
        name: name.trim(),
        email: email || undefined,
        phone: (row.Phone || row.phone || '').toString() || undefined,
        company: row.Company || row.company || undefined,
        source: VALID_SOURCES.includes(source) ? source : 'other',
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'medium',
        value: parseFloat(row.Value || row.value) || undefined,
        notes: row.Notes || row.notes || undefined,
        statusId: statusId || (defaultStatus as any)?._id?.toString(),
        status: statusName || (defaultStatus as any)?.name || 'New',
        tagIds: (defaultTag as any)?._id
          ? [(defaultTag as any)._id.toString()]
          : [],
        workspaceId,
        createdBy: auth.user.id,
      })
    }

    let insertedCount = 0
    if (leadsToCreate.length > 0) {
      const result = await Lead.insertMany(leadsToCreate, { ordered: false })
      insertedCount = result.length
    }

    return NextResponse.json({
      success: true,
      imported: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: rows.length,
      skipped: rows.length - leadsToCreate.length,
      message: `${insertedCount} lead(s) imported successfully${errors.length > 0 ? `, ${errors.length} row(s) skipped` : ''}`,
    })
  } catch (error) {
    log.error('Import leads error:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}
