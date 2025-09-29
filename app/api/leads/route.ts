import { NextRequest, NextResponse } from 'next/server'
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
import { z } from 'zod'

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

// GET /api/leads - Get leads for a workspace with pagination and filtering
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== LEADS API DEBUG START ===')

      try {
        console.log('Connecting to MongoDB...')
        await connectToMongoDB()
        console.log('MongoDB connected successfully')

        console.log('Verifying auth token...')
        const auth = await verifyAuthToken(request)
        console.log('Auth result:', auth ? 'Success' : 'Failed')
        if (!auth) {
          console.log('Auth failed, returning 401')
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

        // Check if user has access to workspace
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

        // Build query
        const query: any = { workspaceId }

        if (status) query.status = status
        if (assignedTo) query.assignedTo = assignedTo
        if (priority) query.priority = priority
        if (tags && tags.length > 0) query.tagIds = { $in: tags }

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ]
        }

        // Get leads with pagination (debug version without populate)
        console.log('Fetching leads with query:', query)
        console.log('Skip:', skip, 'Limit:', limit)

        const [leads, total] = await Promise.all([
          Lead.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Lead.countDocuments(query),
        ])

        console.log('Found leads:', leads.length, 'Total:', total)

        logBusinessEvent('leads_listed', auth.user.id, workspaceId, {
          count: leads.length,
          page,
          filters: { status, assignedTo, priority, search, tags },
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          leads: leads.map(lead => ({
            ...lead,
            id: lead._id,
            tagIds: lead.tagIds || [],
            statusId: lead.statusId || null,
            assignedTo: lead.assignedTo || null,
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
        console.error('=== LEADS API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// POST /api/leads - Create a new lead
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

        // Check if user has access to workspace
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

        // Determine source from request or use default
        let finalSource = validationResult.data.source || 'manual'
        if (!validationResult.data.source) {
          const origin =
            request.headers.get('origin') || request.headers.get('referer')
          if (origin) {
            // Map common domains to source types
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

        const leadData = {
          ...validationResult.data,
          workspaceId,
          status: 'Arrived',
          statusId: validationResult.data.status,
          source: finalSource,
          priority: validationResult.data.priority || 'medium',
          createdBy: auth.user.id,
          nextFollowUpAt: validationResult.data.nextFollowUpAt
            ? new Date(validationResult.data.nextFollowUpAt)
            : undefined,
        }

        // Create lead
        const lead = await Lead.create(leadData)

        // Populate the created lead
        const populatedLead = await Lead.findById(lead._id)
          .populate('tagIds', 'name color')
          .populate('statusId', 'name color')
          .populate('assignedTo', 'fullName email')
          .populate('createdBy', 'fullName email')

        // Log activity in the Activity collection for recent activity display
        let activity = null
        try {
          activity = await Activity.create({
            workspaceId,
            performedBy: auth.user.id,
            activityType: 'created',
            entityType: 'lead',
            entityId: lead._id,
            description: `${auth.user.fullName} created new lead "${leadData.name}"`,
            metadata: {
              leadName: leadData.name,
              source: finalSource,
              value: leadData.value || 0,
              company: leadData.company,
            },
          })
        } catch (activityError) {
          console.error('Failed to log lead creation activity:', activityError)
          // Don't fail the creation if activity logging fails
        }

        // Log activity
        logUserActivity(auth.user.id, 'lead_created', 'lead', {
          leadId: lead._id,
          leadName: leadData.name,
          workspaceId,
        })

        logBusinessEvent('lead_created', auth.user.id, workspaceId, {
          leadName: leadData.name,
          source: leadData.source,
          value: leadData.value,
          duration: Date.now() - startTime,
        })

        // Create notification for lead creation
        try {
          await NotificationService.createNotification({
            workspaceId,
            title: 'New Lead Created',
            message: `${auth.user.fullName || auth.user.email} created a new lead: ${leadData.name}`,
            type: 'success',
            entityType: 'lead',
            entityId: lead._id.toString(),
            createdBy: auth.user.id,
            activityId: activity?._id?.toString(),
            notificationLevel: 'team',
            excludeUserIds: [auth.user.id], // Don't notify the creator
            metadata: {
              leadName: leadData.name,
              source: finalSource,
              value: leadData.value || 0,
              company: leadData.company,
            },
          })
        } catch (notificationError) {
          console.error(
            'Failed to create lead creation notification:',
            notificationError
          )
          // Don't fail the lead creation if notification fails
        }

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
