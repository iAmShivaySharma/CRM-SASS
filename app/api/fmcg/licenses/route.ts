import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgFssaiLicense } from '@/lib/mongodb/models/FmcgFssaiLicense'

const createLicenseSchema = z.object({
  workspaceId: z.string().min(1),
  licenseNumber: z.string().min(1),
  licenseType: z.enum(['registration', 'state', 'central']),
  category: z.string().optional(),
  businessName: z.string().min(1),
  businessAddress: z.string().min(1),
  state: z.string().min(1),
  district: z.string().optional(),
  pincode: z.string().optional(),
  issueDate: z.string(),
  expiryDate: z.string(),
  renewalDate: z.string().optional(),
  status: z.enum(['active', 'expired', 'suspended', 'cancelled', 'renewal_pending']).optional(),
  documentUrl: z.string().optional(),
  remarks: z.string().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const status = url.searchParams.get('status')
        const licenseType = url.searchParams.get('licenseType')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const query: any = { workspaceId }
        if (status) query.status = status
        if (licenseType) query.licenseType = licenseType

        const skip = (page - 1) * limit

        const [licenses, total] = await Promise.all([
          FmcgFssaiLicense.find(query).sort({ expiryDate: 1 }).skip(skip).limit(limit).lean(),
          FmcgFssaiLicense.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          licenses: licenses.map((l: any) => ({ ...l, id: l._id })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        })
      } catch (error) {
        log.error('Get FSSAI licenses error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const validation = createLicenseSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...licenseData } = validation.data

        const existing = await FmcgFssaiLicense.findOne({ workspaceId, licenseNumber: licenseData.licenseNumber })
        if (existing) {
          return NextResponse.json({ message: 'License number already exists in this workspace' }, { status: 409 })
        }

        const license = await FmcgFssaiLicense.create({
          ...licenseData,
          workspaceId,
          issueDate: new Date(licenseData.issueDate),
          expiryDate: new Date(licenseData.expiryDate),
          renewalDate: licenseData.renewalDate ? new Date(licenseData.renewalDate) : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_license_created', 'fmcg_license', {
          licenseId: license._id,
          licenseNumber: license.licenseNumber,
          workspaceId,
        })

        return NextResponse.json(
          { success: true, message: 'License created successfully', license: license.toJSON() },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FSSAI license error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)
