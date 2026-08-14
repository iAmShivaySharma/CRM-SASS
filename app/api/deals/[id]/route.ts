import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Deal, DealActivity, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updateDealSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  contactId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().nullable().optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.any()).optional(),
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

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const deal = await Deal.findOne({ _id: id, workspaceId })
          .populate('contactId', 'name email phone company')
          .populate('leadId', 'name email phone company')
          .populate('assignedTo', 'fullName email')
          .populate('stageId', 'name color probability')
          .populate('pipelineId', 'name currency')
          .populate('tagIds', 'name color')
          .populate('createdBy', 'fullName email')

        if (!deal) {
          return NextResponse.json(
            { message: 'Deal not found' },
            { status: 404 }
          )
        }

        const recentActivities = await DealActivity.find({ dealId: id })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('performedBy', 'fullName email')
          .lean()

        return NextResponse.json({
          success: true,
          deal: deal.toJSON(),
          activities: recentActivities.map((a: any) => ({
            ...a,
            id: a._id,
            performedBy:
              typeof a.performedBy === 'object' && a.performedBy
                ? { ...a.performedBy, id: a.performedBy._id }
                : a.performedBy,
          })),
        })
      } catch (error) {
        log.error('Get deal error:', error)
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
        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateDealSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const deal = await Deal.findOne({ _id: id, workspaceId })
        if (!deal) {
          return NextResponse.json(
            { message: 'Deal not found' },
            { status: 404 }
          )
        }

        const changes: string[] = []
        const data = validationResult.data

        if (data.title && data.title !== deal.title) {
          changes.push(`title: "${deal.title}" → "${data.title}"`)
        }
        if (data.value !== undefined && data.value !== deal.value) {
          changes.push(
            `value: ₹${deal.value.toLocaleString()} → ₹${data.value.toLocaleString()}`
          )
        }
        if (data.priority && data.priority !== deal.priority) {
          changes.push(`priority: ${deal.priority} → ${data.priority}`)
        }
        if (
          data.assignedTo !== undefined &&
          data.assignedTo !== deal.assignedTo
        ) {
          changes.push('assignee changed')
        }

        if (data.customFields) {
          ;(deal as any).customData = data.customFields
        }

        if (data.expectedCloseDate) {
          ;(data as any).expectedCloseDate = new Date(data.expectedCloseDate)
        } else if (data.expectedCloseDate === null) {
          ;(data as any).expectedCloseDate = null
        }

        Object.assign(deal, data)
        await deal.save()

        if (changes.length > 0) {
          const activityType =
            data.value !== undefined ? 'value_changed' : 'updated'
          await DealActivity.create({
            workspaceId,
            dealId: id,
            type: activityType,
            description: `Updated deal: ${changes.join(', ')}`,
            metadata: { changes },
            performedBy: auth.user.id,
          })
        }

        const populatedDeal = await Deal.findById(id)
          .populate('contactId', 'name email phone company')
          .populate('leadId', 'name email phone company')
          .populate('assignedTo', 'fullName email')
          .populate('stageId', 'name color probability')
          .populate('tagIds', 'name color')

        return NextResponse.json({
          success: true,
          message: 'Deal updated successfully',
          deal: populatedDeal?.toJSON(),
        })
      } catch (error) {
        log.error('Update deal error:', error)
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

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.delete'
        )
        if (permError) return permError

        const deal = await Deal.findOne({ _id: id, workspaceId })
        if (!deal) {
          return NextResponse.json(
            { message: 'Deal not found' },
            { status: 404 }
          )
        }

        await Deal.findByIdAndDelete(id)
        await DealActivity.deleteMany({ dealId: id })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'deleted',
          entityType: 'deal',
          entityId: id,
          description: `Deleted deal "${deal.title}"`,
        })

        return NextResponse.json({
          success: true,
          message: 'Deal deleted successfully',
        })
      } catch (error) {
        log.error('Delete deal error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
