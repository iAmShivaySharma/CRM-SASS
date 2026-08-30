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

const createRecallEventSchema = z.object({
  workspaceId: z.string().min(1),
  recallNumber: z.string().min(1),
  recallClass: z.enum(['I', 'II', 'III']),
  status: z.enum(['initiated', 'in_progress', 'closed']).optional(),
  trigger: z.enum([
    'internal_testing',
    'consumer_complaint',
    'distributor_report',
    'fssai_alert',
    'audit_finding',
    'supplier_notification',
    'batch_record_error',
    'labelling_error',
  ]),
  affectedBatchNumbers: z.array(z.string()),
  affectedProductIds: z.array(z.string()),
  description: z.string().min(1),
  initiatedAt: z.string(),
  initiatedBy: z.string().min(1),
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
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const status = url.searchParams.get('status')
        const recallClass = url.searchParams.get('recallClass')
        const mockDrill = url.searchParams.get('mockDrill')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (status) query.status = status
        if (recallClass) query.recallClass = recallClass
        if (mockDrill !== null && mockDrill !== undefined) {
          query.mockDrill = mockDrill === 'true'
        }

        const skip = (page - 1) * limit

        const [recallEvents, total] = await Promise.all([
          FmcgRecallEvent.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgRecallEvent.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          recallEvents: recallEvents.map((r: any) => ({ ...r, id: r._id })),
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
        log.error('Get FMCG recall events error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
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
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const body = await request.json()
        const validation = createRecallEventSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...eventData } = validation.data

        const existing = await FmcgRecallEvent.findOne({
          workspaceId,
          recallNumber: eventData.recallNumber,
        })
        if (existing) {
          return NextResponse.json(
            { message: 'Recall number already exists in this workspace' },
            { status: 409 }
          )
        }

        const recallEvent = await FmcgRecallEvent.create({
          ...eventData,
          workspaceId,
          initiatedAt: new Date(eventData.initiatedAt),
          fssaiNotificationAt: eventData.fssaiNotificationAt
            ? new Date(eventData.fssaiNotificationAt)
            : undefined,
          disposalDate: eventData.disposalDate
            ? new Date(eventData.disposalDate)
            : undefined,
          closedAt: eventData.closedAt
            ? new Date(eventData.closedAt)
            : undefined,
          distributorNotifications: eventData.distributorNotifications?.map(
            n => ({
              ...n,
              notifiedAt: new Date(n.notifiedAt),
            })
          ),
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_recall_event_created',
          'fmcg_recall_event',
          {
            recallEventId: recallEvent._id,
            recallNumber: recallEvent.recallNumber,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Recall event created successfully',
            recallEvent: recallEvent.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG recall event error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
