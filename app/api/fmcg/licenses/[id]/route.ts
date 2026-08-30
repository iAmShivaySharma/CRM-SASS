import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgFssaiLicense } from '@/lib/mongodb/models/FmcgFssaiLicense'

const updateLicenseSchema = z.object({
  licenseNumber: z.string().optional(),
  licenseType: z.enum(['registration', 'state', 'central']).optional(),
  category: z.string().optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  pincode: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  renewalDate: z.string().optional(),
  status: z.enum(['active', 'expired', 'suspended', 'cancelled', 'renewal_pending']).optional(),
  documentUrl: z.string().optional(),
  remarks: z.string().optional(),
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

        const license = await FmcgFssaiLicense.findOne({ _id: id, workspaceId }).lean()
        if (!license) {
          return NextResponse.json({ message: 'License not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, license: { ...(license as any), id: (license as any)._id } })
      } catch (error) {
        log.error('Get FSSAI license error:', error)
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
        const validation = updateLicenseSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate)
        if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate)
        if (updateData.renewalDate) updateData.renewalDate = new Date(updateData.renewalDate)

        const license = await FmcgFssaiLicense.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!license) {
          return NextResponse.json({ message: 'License not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_license_updated', 'fmcg_license', { licenseId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'License updated successfully', license: license.toJSON() })
      } catch (error) {
        log.error('Update FSSAI license error:', error)
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

        const license = await FmcgFssaiLicense.findOneAndDelete({ _id: id, workspaceId })

        if (!license) {
          return NextResponse.json({ message: 'License not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_license_deleted', 'fmcg_license', { licenseId: id, workspaceId })

        return NextResponse.json({ success: true, message: 'License deleted successfully' })
      } catch (error) {
        log.error('Delete FSSAI license error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    }
  )
)
