import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import * as XLSX from 'xlsx'

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
      'contacts.create'
    )
    if (permError) return permError

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or has no valid data' },
        { status: 400 }
      )
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { error: 'Cannot import more than 1000 contacts at once' },
        { status: 400 }
      )
    }

    const { Contact } = await import('@/lib/mongodb/client')

    const results = { imported: 0, skipped: 0, errors: [] as string[] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const name =
          row.Name || row.name || row['Full Name'] || row['full_name']
        if (!name) {
          results.skipped++
          results.errors.push(`Row ${i + 2}: Missing name`)
          continue
        }

        const email =
          row.Email || row.email || row['Email Address'] || row['email_address']

        if (email) {
          const existing = await Contact.findOne({
            workspaceId,
            email: email.toLowerCase().trim(),
          })
          if (existing) {
            results.skipped++
            results.errors.push(
              `Row ${i + 2}: Contact with email ${email} already exists`
            )
            continue
          }
        }

        await Contact.create({
          workspaceId,
          name: String(name).trim(),
          email: email ? String(email).toLowerCase().trim() : undefined,
          phone: row.Phone || row.phone || row['Phone Number'] || undefined,
          company:
            row.Company || row.company || row['Company Name'] || undefined,
          jobTitle:
            row['Job Title'] || row.jobTitle || row['job_title'] || undefined,
          address: {
            street: row.Street || row.street || undefined,
            city: row.City || row.city || undefined,
            state: row.State || row.state || undefined,
            zipCode: row['Zip Code'] || row.zipCode || row.zip || undefined,
            country: row.Country || row.country || undefined,
          },
          notes: row.Notes || row.notes || undefined,
          createdBy: auth.user.id,
        })

        results.imported++
      } catch (error) {
        results.skipped++
        results.errors.push(
          `Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      total: rows.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to import contacts' },
      { status: 500 }
    )
  }
}
