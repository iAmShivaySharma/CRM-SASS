import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Lead,
  WorkspaceMember,
  Tag,
  LeadStatus,
  Activity,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { NotificationService } from '@/lib/services/notificationService'
import { activityQueue, notificationQueue } from '@/lib/queue/queues'
import { checkPermission } from '@/lib/security/check-permission'

const createLeadSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  status: z.string().optional(),
  statusId: z.string().optional(),
  source: z
    .enum([
      'manual',
      'website',
      'referral',
      'social',
      'social_media',
      'email',
      'phone',
      'other',
    ])
    .optional(),
  value: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  customFields: z.record(z.any()).optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

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
        const assignedTo = url.searchParams.get('assignedTo')
        const priority = url.searchParams.get('priority')
        const search = url.searchParams.get('search')
        const tags = url.searchParams.get('tags')?.split(',').filter(Boolean)
        const skip = (page - 1) * limit

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const query: any = { workspaceId }

        if (status) query.statusId = status
        if (assignedTo) query.assignedTo = assignedTo
        if (priority) query.priority = priority
        if (tags && tags.length > 0) query.tagIds = { $in: tags }

        if (search) {
          query.$text = { $search: search }
        }

        const [leads, total] = await Promise.all([
          Lead.find(query)
            .select(
              'name email phone company status statusId source value assignedTo tagIds priority createdBy createdAt nextFollowUpAt'
            )
            .populate('statusId', 'name color')
            .populate('tagIds', 'name color')
            .populate('assignedTo', 'fullName email')
            .sort(
              search ? { score: { $meta: 'textScore' } } : { createdAt: -1 }
            )
            .skip(skip)
            .limit(limit)
            .lean(),
          Lead.countDocuments(query),
        ])

        logBusinessEvent('leads_listed', auth.user.id, workspaceId, {
          count: leads.length,
          page,
          filters: { status, assignedTo, priority, search, tags },
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          leads: leads.map((lead: any) => ({
            ...lead,
            id: lead._id,
            tagIds: (lead.tagIds || []).map((tag: any) =>
              typeof tag === 'object'
                ? { ...tag, id: tag._id?.toString() || tag._id }
                : tag
            ),
            statusId:
              typeof lead.statusId === 'object' && lead.statusId
                ? {
                    ...lead.statusId,
                    id: lead.statusId._id?.toString() || lead.statusId._id,
                  }
                : lead.statusId || null,
            assignedTo:
              typeof lead.assignedTo === 'object' && lead.assignedTo
                ? {
                    ...lead.assignedTo,
                    id: lead.assignedTo._id?.toString() || lead.assignedTo._id,
                  }
                : lead.assignedTo || null,
            createdBy: lead.createdBy || null,
          })),
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
        log.error('Get leads error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.stack
                  : undefined
                : undefined,
          },
          { status: 500 }
        )
      }
    },
    {
      logBody: false,
      logHeaders: true,
    }
  )
)

export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

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
        const validationResult = createLeadSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        let finalSource = validationResult.data.source || 'manual'
        if (!validationResult.data.source) {
          const origin =
            request.headers.get('origin') || request.headers.get('referer')
          if (origin) {
            const hostname = new URL(origin).hostname.toLowerCase()
            if (hostname.includes('facebook')) {
              finalSource = 'social_media'
            } else if (
              hostname.includes('google') ||
              hostname.includes('gmail')
            ) {
              finalSource = 'email'
            } else if (
              hostname.includes('linkedin') ||
              hostname.includes('twitter') ||
              hostname.includes('instagram')
            ) {
              finalSource = 'social_media'
            } else {
              finalSource = 'website'
            }
          }
        }

        const defaultStatus = await LeadStatus.findOne({
          workspaceId,
          isDefault: true,
        }).lean()

        const defaultTag = await Tag.findOne({
          workspaceId,
          name: 'Cold Lead',
        }).lean()

        const leadData = {
          ...validationResult.data,
          workspaceId,
          status: (defaultStatus as any)?.name || 'New',
          statusId:
            validationResult.data.statusId ||
            (defaultStatus as any)?._id?.toString(),
          tagIds: validationResult.data.tagIds?.length
            ? validationResult.data.tagIds
            : defaultTag
              ? [(defaultTag as any)._id.toString()]
              : [],
          source: finalSource,
          priority: validationResult.data.priority || 'medium',
          createdBy: auth.user.id,
          nextFollowUpAt: validationResult.data.nextFollowUpAt
            ? new Date(validationResult.data.nextFollowUpAt)
            : undefined,
        }

        const lead = await Lead.create(leadData)

        const populatedLead = await Lead.findById(lead._id)
          .populate('tagIds', 'name color')
          .populate('statusId', 'name color')
          .populate('assignedTo', 'fullName email')
          .populate('createdBy', 'fullName email')

        await activityQueue.add('lead-created', {
          workspaceId,
          performedBy: auth.user.id,
          activityType: 'created',
          entityType: 'lead',
          entityId: lead._id.toString(),
          description: `${auth.user.fullName} created new lead "${leadData.name}"`,
          metadata: {
            leadName: leadData.name,
            source: finalSource,
            value: leadData.value || 0,
            company: leadData.company,
          },
        })

        await notificationQueue.add('lead-created', {
          workspaceId,
          title: 'New Lead Created',
          message: `${auth.user.fullName || auth.user.email} created a new lead: ${leadData.name}`,
          type: 'success',
          entityType: 'lead',
          entityId: lead._id.toString(),
          createdBy: auth.user.id,
          notificationLevel: 'team',
          excludeUserIds: [auth.user.id],
          metadata: {
            leadName: leadData.name,
            source: finalSource,
            value: leadData.value || 0,
            company: leadData.company,
          },
        })

        logUserActivity(auth.user.id, 'lead_created', 'lead', {
          leadId: lead._id,
          leadName: leadData.name,
          workspaceId,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Lead created successfully',
            lead: populatedLead?.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create lead error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: true,
      logHeaders: true,
    }
  )
)
