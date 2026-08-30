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

const createComplaintSchema = z.object({
  workspaceId: z.string().min(1),
  referenceNumber: z.string().min(1),
  dateReceived: z.string(),
  source: z.enum([
    'consumer',
    'retailer',
    'distributor',
    'online_review',
    'internal',
  ]),
  customerName: z.string().optional(),
  customerContact: z.string().optional(),
  productId: z.string().optional(),
  batchNumber: z.string().optional(),
  nature: z.enum([
    'foreign_body',
    'spoilage',
    'illness',
    'labelling',
    'weight',
    'packaging',
    'other',
  ]),
  description: z.string().max(2000).min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  investigatedBy: z.string().optional(),
  rootCauseFound: z.string().optional(),
  actionTaken: z.enum([
    'replacement',
    'refund',
    'recall_initiated',
    'no_action',
    'under_investigation',
  ]),
  closedDate: z.string().optional(),
  customerInformed: z.boolean().optional(),
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
        const severity = url.searchParams.get('severity')
        const source = url.searchParams.get('source')
        const nature = url.searchParams.get('nature')
        const search = url.searchParams.get('search')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }

        if (severity) query.severity = severity
        if (source) query.source = source
        if (nature) query.nature = nature
        if (search) {
          query.$or = [
            { referenceNumber: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ]
        }

        const skip = (page - 1) * limit

        const [complaints, total] = await Promise.all([
          FmcgComplaintRegister.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          FmcgComplaintRegister.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          complaints: complaints.map((c: any) => ({ ...c, id: c._id })),
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
        log.error('Get FMCG complaints error:', error)
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
        const validation = createComplaintSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...complaintData } = validation.data

        const existing = await FmcgComplaintRegister.findOne({
          workspaceId,
          referenceNumber: complaintData.referenceNumber,
        })
        if (existing) {
          return NextResponse.json(
            { message: 'Reference number already exists in this workspace' },
            { status: 409 }
          )
        }

        const complaint = await FmcgComplaintRegister.create({
          ...complaintData,
          workspaceId,
          dateReceived: new Date(complaintData.dateReceived),
          closedDate: complaintData.closedDate
            ? new Date(complaintData.closedDate)
            : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'fmcg_complaint_created',
          'fmcg_complaint',
          {
            complaintId: complaint._id,
            referenceNumber: complaint.referenceNumber,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Complaint created successfully',
            complaint: complaint.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG complaint error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
