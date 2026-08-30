import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgComplaintRegister } from '@/lib/mongodb/models/FmcgComplaintRegister'

const updateComplaintSchema = z.object({
  referenceNumber: z.string().optional(),
  dateReceived: z.string().optional(),
  source: z
    .enum(['consumer', 'retailer', 'distributor', 'online_review', 'internal'])
    .optional(),
  customerName: z.string().optional(),
  customerContact: z.string().optional(),
  productId: z.string().optional(),
  batchNumber: z.string().optional(),
  nature: z
    .enum([
      'foreign_body',
      'spoilage',
      'illness',
      'labelling',
      'weight',
      'packaging',
      'other',
    ])
    .optional(),
  description: z.string().max(2000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  investigatedBy: z.string().optional(),
  rootCauseFound: z.string().optional(),
  actionTaken: z
    .enum([
      'replacement',
      'refund',
      'recall_initiated',
      'no_action',
      'under_investigation',
    ])
    .optional(),
  closedDate: z.string().optional(),
  customerInformed: z.boolean().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const complaint = await FmcgComplaintRegister.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!complaint) {
          return NextResponse.json(
            { message: 'Complaint not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          complaint: { ...(complaint as any), id: (complaint as any)._id },
        })
      } catch (error) {
        log.error('Get FMCG complaint error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validation = updateComplaintSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.dateReceived)
          updateData.dateReceived = new Date(updateData.dateReceived)
        if (updateData.closedDate)
          updateData.closedDate = new Date(updateData.closedDate)

        const complaint = await FmcgComplaintRegister.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!complaint) {
          return NextResponse.json(
            { message: 'Complaint not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_complaint_updated',
          'fmcg_complaint',
          { complaintId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Complaint updated successfully',
          complaint: complaint.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG complaint error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const complaint = await FmcgComplaintRegister.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!complaint) {
          return NextResponse.json(
            { message: 'Complaint not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_complaint_deleted',
          'fmcg_complaint',
          { complaintId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Complaint deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG complaint error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
