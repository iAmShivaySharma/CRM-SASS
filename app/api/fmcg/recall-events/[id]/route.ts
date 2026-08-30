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
import { FmcgRecallEvent } from '@/lib/mongodb/models/FmcgRecallEvent'

const distributorNotificationSchema = z.object({
  recipientName: z.string().min(1),
  recipientContact: z.string().min(1),
  notifiedAt: z.string(),
  channel: z.enum(['email', 'phone', 'whatsapp']),
  acknowledged: z.boolean().optional(),
  quantityHeld: z.number().optional(),
})

const updateRecallEventSchema = z.object({
  recallNumber: z.string().optional(),
  recallClass: z.enum(['I', 'II', 'III']).optional(),
  status: z.enum(['initiated', 'in_progress', 'closed']).optional(),
  trigger: z
    .enum([
      'internal_testing',
      'consumer_complaint',
      'distributor_report',
      'fssai_alert',
      'audit_finding',
      'supplier_notification',
      'batch_record_error',
      'labelling_error',
    ])
    .optional(),
  affectedBatchNumbers: z.array(z.string()).optional(),
  affectedProductIds: z.array(z.string()).optional(),
  description: z.string().optional(),
  initiatedAt: z.string().optional(),
  initiatedBy: z.string().optional(),
  fssaiNotificationAt: z.string().optional(),
  fssaiReferenceNumber: z.string().optional(),
  distributorNotifications: z.array(distributorNotificationSchema).optional(),
  quantityManufactured: z.number().optional(),
  quantityDistributed: z.number().optional(),
  quantityInStock: z.number().optional(),
  quantityRecalled: z.number().optional(),
  quantityReturned: z.number().optional(),
  disposalMethod: z.string().optional(),
  disposalDate: z.string().optional(),
  disposalSupervisor: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveActions: z.string().optional(),
  preventiveActions: z.string().optional(),
  closedAt: z.string().optional(),
  closedBy: z.string().optional(),
  finalReportUrl: z.string().optional(),
  mockDrill: z.boolean().optional(),
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

        const recallEvent = await FmcgRecallEvent.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!recallEvent) {
          return NextResponse.json(
            { message: 'Recall event not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          recallEvent: {
            ...(recallEvent as any),
            id: (recallEvent as any)._id,
          },
        })
      } catch (error) {
        log.error('Get FMCG recall event error:', error)
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
        const validation = updateRecallEventSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.initiatedAt)
          updateData.initiatedAt = new Date(updateData.initiatedAt)
        if (updateData.fssaiNotificationAt)
          updateData.fssaiNotificationAt = new Date(
            updateData.fssaiNotificationAt
          )
        if (updateData.disposalDate)
          updateData.disposalDate = new Date(updateData.disposalDate)
        if (updateData.closedAt)
          updateData.closedAt = new Date(updateData.closedAt)
        if (updateData.distributorNotifications) {
          updateData.distributorNotifications =
            updateData.distributorNotifications.map((n: any) => ({
              ...n,
              notifiedAt: new Date(n.notifiedAt),
            }))
        }

        const recallEvent = await FmcgRecallEvent.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        )

        if (!recallEvent) {
          return NextResponse.json(
            { message: 'Recall event not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_recall_event_updated',
          'fmcg_recall_event',
          { recallEventId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Recall event updated successfully',
          recallEvent: recallEvent.toJSON(),
        })
      } catch (error) {
        log.error('Update FMCG recall event error:', error)
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

        const recallEvent = await FmcgRecallEvent.findOneAndDelete({
          _id: id,
          workspaceId,
        })

        if (!recallEvent) {
          return NextResponse.json(
            { message: 'Recall event not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'fmcg_recall_event_deleted',
          'fmcg_recall_event',
          { recallEventId: id, workspaceId }
        )

        return NextResponse.json({
          success: true,
          message: 'Recall event deleted successfully',
        })
      } catch (error) {
        log.error('Delete FMCG recall event error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)
