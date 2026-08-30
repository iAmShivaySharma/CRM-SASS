import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgSupplier } from '@/lib/mongodb/models/FmcgSupplier'

const createSupplierSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(200),
  code: z.string().optional(),
  fssaiLicenseNumber: z.string().optional(),
  fssaiLicenseExpiry: z.string().optional(),
  gstNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  categories: z.array(z.string()).optional(),
  approvalStatus: z.enum(['pending', 'approved', 'suspended', 'blacklisted']).optional(),
  approvalDate: z.string().optional(),
  approvalNotes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
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
        const search = url.searchParams.get('search')
        const approvalStatus = url.searchParams.get('approvalStatus')
        const isActiveParam = url.searchParams.get('isActive')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const query: any = { workspaceId }

        if (approvalStatus) query.approvalStatus = approvalStatus
        if (isActiveParam !== null) query.isActive = isActiveParam === 'true'
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { contactPerson: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { fssaiLicenseNumber: { $regex: search, $options: 'i' } },
          ]
        }

        const skip = (page - 1) * limit

        const [suppliers, total] = await Promise.all([
          FmcgSupplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          FmcgSupplier.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          suppliers: suppliers.map((s: any) => ({ ...s, id: s._id })),
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
        log.error('Get FMCG suppliers error:', error)
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
        const validation = createSupplierSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...supplierData } = validation.data

        const supplier = await FmcgSupplier.create({
          ...supplierData,
          workspaceId,
          fssaiLicenseExpiry: supplierData.fssaiLicenseExpiry
            ? new Date(supplierData.fssaiLicenseExpiry)
            : undefined,
          approvalDate: supplierData.approvalDate
            ? new Date(supplierData.approvalDate)
            : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_supplier_created', 'fmcg', {
          supplierId: supplier._id,
          name: supplier.name,
        })

        return NextResponse.json(
          { success: true, message: 'Supplier created successfully', supplier: supplier.toJSON() },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG supplier error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)
