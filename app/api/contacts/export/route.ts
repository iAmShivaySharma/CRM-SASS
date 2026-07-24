import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
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
      'contacts.view'
    )
    if (permError) return permError

    const { Contact } = await import('@/lib/mongodb/client')

    const contacts = await Contact.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean()

    const rows = (contacts as any[]).map(contact => ({
      Name: contact.name || '',
      Email: contact.email || '',
      Phone: contact.phone || '',
      Company: contact.company || '',
      'Job Title': contact.jobTitle || '',
      Street: contact.address?.street || '',
      City: contact.address?.city || '',
      State: contact.address?.state || '',
      'Zip Code': contact.address?.zipCode || '',
      Country: contact.address?.country || '',
      Notes: contact.notes || '',
      'Created At': contact.createdAt
        ? new Date(contact.createdAt).toISOString().split('T')[0]
        : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts')

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 40 },
      { wch: 12 },
    ]

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="contacts.csv"',
        },
      })
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="contacts.xlsx"',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export contacts' },
      { status: 500 }
    )
  }
}
