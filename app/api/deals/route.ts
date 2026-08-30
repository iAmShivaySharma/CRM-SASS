import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Deal,
  Pipeline,
  PipelineStage,
  WorkspaceMember,
  Activity,
  DealActivity,
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
import { checkPermission } from '@/lib/security/check-permission'

const createDealSchema = z.object({
  title: z.string().min(1).max(200),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  value: z.number().min(0).optional(),
  currency: z.string().max(5).optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.any()).optional(),
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
        const pipelineId = url.searchParams.get('pipelineId')
        const stageId = url.searchParams.get('stageId')
        const status = url.searchParams.get('status')
        const assignedTo = url.searchParams.get('assignedTo')
        const priority = url.searchParams.get('priority')
        const search = url.searchParams.get('search')
        const contactId = url.searchParams.get('contactId')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const sortBy = url.searchParams.get('sortBy') || 'createdAt'
        const sortOrder = url.searchParams.get('sortOrder') || 'desc'
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
        if (pipelineId) query.pipelineId = pipelineId
        if (stageId) query.stageId = stageId
        if (status) query.status = status
        if (assignedTo) query.assignedTo = assignedTo
        if (priority) query.priority = priority
        if (contactId) query.contactId = contactId
        if (search) query.$text = { $search: search }

        const sortMap: Record<string, any> = {
          createdAt: { createdAt: sortOrder === 'asc' ? 1 : -1 },
          value: { value: sortOrder === 'asc' ? 1 : -1 },
          title: { title: sortOrder === 'asc' ? 1 : -1 },
          expectedCloseDate: {
            expectedCloseDate: sortOrder === 'asc' ? 1 : -1,
          },
        }
        const sortOption = search
          ? { score: { $meta: 'textScore' } }
          : sortMap[sortBy] || { createdAt: -1 }

        const [deals, total] = await Promise.all([
          Deal.find(query)
            .populate('contactId', 'name email phone company')
            .populate('leadId', 'name email phone company')
            .populate('assignedTo', 'fullName email')
            .populate('stageId', 'name color probability')
            .populate('tagIds', 'name color')
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean(),
          Deal.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          deals: deals.map((deal: any) => ({
            ...deal,
            id: deal._id,
            contactId:
              typeof deal.contactId === 'object' && deal.contactId
                ? { ...deal.contactId, id: deal.contactId._id }
                : deal.contactId || null,
            leadId:
              typeof deal.leadId === 'object' && deal.leadId
                ? { ...deal.leadId, id: deal.leadId._id }
                : deal.leadId || null,
            assignedTo:
              typeof deal.assignedTo === 'object' && deal.assignedTo
                ? { ...deal.assignedTo, id: deal.assignedTo._id }
                : deal.assignedTo || null,
            stageId:
              typeof deal.stageId === 'object' && deal.stageId
                ? { ...deal.stageId, id: deal.stageId._id }
                : deal.stageId || null,
            tagIds: (deal.tagIds || []).map((tag: any) =>
              typeof tag === 'object'
                ? { ...tag, id: tag._id?.toString() }
                : tag
            ),
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
        log.error('Get deals error:', error)
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
        const validationResult = createDealSchema.safeParse(body)

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

        const { pipelineId, stageId } = validationResult.data

        const [pipeline, stage] = await Promise.all([
          Pipeline.findOne({
            _id: pipelineId,
            workspaceId,
            isActive: true,
          }),
          PipelineStage.findOne({
            _id: stageId,
            pipelineId,
            isActive: true,
          }),
        ])

        if (!pipeline) {
          return NextResponse.json(
            { message: 'Pipeline not found' },
            { status: 404 }
          )
        }
        if (!stage) {
          return NextResponse.json(
            { message: 'Stage not found' },
            { status: 404 }
          )
        }

        const deal = await Deal.create({
          ...validationResult.data,
          workspaceId,
          currency: validationResult.data.currency || pipeline.currency,
          probability: validationResult.data.probability ?? stage.probability,
          customData: validationResult.data.customFields || {},
          expectedCloseDate: validationResult.data.expectedCloseDate
            ? new Date(validationResult.data.expectedCloseDate)
            : undefined,
          stageEnteredAt: new Date(),
          stageHistory: [
            {
              stageId: stageId,
              stageName: stage.name,
              enteredAt: new Date(),
            },
          ],
          createdBy: auth.user.id,
        })

        const populatedDeal = await Deal.findById(deal._id)
          .populate('contactId', 'name email phone company')
          .populate('leadId', 'name email phone company')
          .populate('assignedTo', 'fullName email')
          .populate('stageId', 'name color probability')
          .populate('tagIds', 'name color')

        await DealActivity.create({
          workspaceId,
          dealId: deal._id.toString(),
          type: 'created',
          description: `Deal "${validationResult.data.title}" created in ${stage.name}`,
          metadata: {
            pipelineId,
            stageId,
            stageName: stage.name,
            value: validationResult.data.value || 0,
          },
          performedBy: auth.user.id,
        })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'created',
          entityType: 'deal',
          entityId: deal._id.toString(),
          description: `Created deal "${validationResult.data.title}"`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'New Deal Created',
          message: `${auth.user.fullName || auth.user.email} created a new deal: ${validationResult.data.title} (${validationResult.data.value ? `₹${validationResult.data.value.toLocaleString()}` : 'No value'})`,
          type: 'success',
          entityType: 'deal',
          entityId: deal._id.toString(),
          createdBy: auth.user.id,
          notificationLevel: 'team',
          excludeUserIds: [auth.user.id],
        }).catch(() => {})

        logUserActivity(auth.user.id, 'deal_created', 'deal', {
          dealId: deal._id,
          title: validationResult.data.title,
          value: validationResult.data.value,
          workspaceId,
        })

        logBusinessEvent('deal_created', auth.user.id, workspaceId, {
          dealId: deal._id,
          value: validationResult.data.value || 0,
          pipelineId,
          stageName: stage.name,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Deal created successfully',
            deal: populatedDeal?.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create deal error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
