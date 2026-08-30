import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgSupplier } from '@/lib/mongodb/models/FmcgSupplier'

const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const supplier = await FmcgSupplier.findOne({ _id: id, workspaceId }).lean()
        if (!supplier) {
          return NextResponse.json({ message: 'Supplier not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, supplier: { ...(supplier as any), id: (supplier as any)._id } })
      } catch (error) {
        log.error('Get FMCG supplier error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const body = await request.json()
        const validation = updateSupplierSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.fssaiLicenseExpiry) updateData.fssaiLicenseExpiry = new Date(updateData.fssaiLicenseExpiry)
        if (updateData.approvalDate) updateData.approvalDate = new Date(updateData.approvalDate)

        const supplier = await FmcgSupplier.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!supplier) {
          return NextResponse.json({ message: 'Supplier not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_supplier_updated', 'fmcg', { supplierId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Supplier updated successfully', supplier: supplier.toJSON() })
      } catch (error) {
        log.error('Update FMCG supplier error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const supplier = await FmcgSupplier.findOneAndDelete({ _id: id, workspaceId })

        if (!supplier) {
          return NextResponse.json({ message: 'Supplier not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_supplier_deleted', 'fmcg', { supplierId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'Supplier deleted successfully' })
      } catch (error) {
        log.error('Delete FMCG supplier error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    }
  )
)
