import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead, WorkspaceMember, Activity } from '@/lib/mongodb/client'
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

// Validation schema for updating leads
const updateLeadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .optional(),
  email: z
    .string()
    .email('Invalid email')
    .max(255, 'Email too long')
    .optional()
    .or(z.literal('')),
  phone: z.string().max(20, 'Phone too long').optional().or(z.literal('')),
  company: z
    .string()
    .max(100, 'Company name too long')
    .optional()
    .or(z.literal('')),
  value: z
    .number()
    .min(0, 'Value must be positive')
    .max(999999999, 'Value too large')
    .optional(),
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
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  statusId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid status ID format')
    .optional()
    .or(z.literal('')),
  tagIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid tag ID format'))
    .max(10, 'Too many tags')
    .optional(),
  assignedTo: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID format')
    .optional()
    .or(z.literal('')),
  customFields: z.record(z.any()).optional(), // Allow custom fields as key-value pairs
  customData: z.record(z.any()).optional(), // Support both customFields and customData
})

// PUT /api/leads/[id] - Update a lead
export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const startTime = Date.now()
      console.log('=== LEAD UPDATE API DEBUG START ===')

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

        const { id: leadId } = await params
        console.log('Lead ID:', leadId)
        console.log('Reading request body...')
        const body = await request.json()
        console.log('Request body:', body)

        // Get workspaceId from query params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        console.log('Workspace ID:', workspaceId)

        if (!workspaceId) {
          console.log('No workspace ID provided')
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        // Validate request body
        console.log('Validating request body...')
        const validationResult = updateLeadSchema.safeParse(body)
        console.log('Validation result:', validationResult.success)
        if (!validationResult.success) {
          console.log('Validation errors:', validationResult.error.errors)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const updateData = validationResult.data

        // Check if user has access to this workspace
        console.log('Checking workspace membership...')
        const userMembership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        })
        console.log('User membership found:', !!userMembership)

        if (!userMembership) {
          console.log('Access denied - no workspace membership')
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Additional security: Validate that statusId and tagIds belong to the same workspace
        if (updateData.statusId && updateData.statusId !== '') {
          const { LeadStatus } = await import('@/lib/mongodb/client')
          const statusExists = await LeadStatus.findOne({
            _id: updateData.statusId,
            workspaceId,
          })
          if (!statusExists) {
            return NextResponse.json(
              { message: 'Invalid status ID' },
              { status: 400 }
            )
          }
        }

        if (updateData.tagIds && updateData.tagIds.length > 0) {
          const { Tag } = await import('@/lib/mongodb/client')
          const validTags = await Tag.find({
            _id: { $in: updateData.tagIds },
            workspaceId,
          })
          if (validTags.length !== updateData.tagIds.length) {
            return NextResponse.json(
              { message: 'One or more invalid tag IDs' },
              { status: 400 }
            )
          }
        }

        if (updateData.assignedTo && updateData.assignedTo !== '') {
          const assignedUserMembership = await WorkspaceMember.findOne({
            workspaceId,
            userId: updateData.assignedTo,
            status: 'active',
          })
          if (!assignedUserMembership) {
            return NextResponse.json(
              { message: 'Invalid assigned user ID' },
              { status: 400 }
            )
          }
        }

        // Find and update the lead
        console.log(
          'Finding lead with ID:',
          leadId,
          'in workspace:',
          workspaceId
        )
        const lead = await Lead.findOne({ _id: leadId, workspaceId })
        console.log('Lead found:', !!lead)
        if (!lead) {
          console.log('Lead not found')
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

        // Track changes for activity logging
        const changes: { field: string; oldValue: any; newValue: any }[] = []
        const originalLead = lead.toObject()

        // Update the lead with provided data
        console.log('Updating lead with data:', updateData)

        // Handle custom fields mapping (frontend sends customFields, model uses customData)
        if (updateData.customFields) {
          console.log('Updating custom fields:', updateData.customFields)
          const oldCustomData = { ...lead.customData }
          lead.customData = { ...lead.customData, ...updateData.customFields }

          // Track custom field changes
          Object.keys(updateData.customFields).forEach(key => {
            if (oldCustomData[key] !== updateData.customFields![key]) {
              changes.push({
                field: `customFields.${key}`,
                oldValue: oldCustomData[key],
                newValue: updateData.customFields![key],
              })
            }
          })

          delete updateData.customFields // Remove from updateData to avoid overwriting
        }

        // Handle direct customData updates
        if (updateData.customData) {
          console.log('Updating custom data:', updateData.customData)
          const oldCustomData = { ...lead.customData }
          lead.customData = { ...lead.customData, ...updateData.customData }

          // Track custom data changes
          Object.keys(updateData.customData).forEach(key => {
            if (oldCustomData[key] !== updateData.customData![key]) {
              changes.push({
                field: `customData.${key}`,
                oldValue: oldCustomData[key],
                newValue: updateData.customData![key],
              })
            }
          })

          delete updateData.customData // Remove from updateData to avoid overwriting
        }

        // Track regular field changes
        Object.keys(updateData).forEach(key => {
          const typedKey = key as keyof typeof updateData
          if (originalLead[typedKey] !== updateData[typedKey]) {
            changes.push({
              field: key,
              oldValue: originalLead[typedKey],
              newValue: updateData[typedKey],
            })
          }
        })

        Object.assign(lead, updateData)
        lead.updatedAt = new Date()
        console.log('Saving lead...')
        await lead.save()
        console.log('Lead saved successfully')

        // Populate the updated lead
        const populatedLead = await Lead.findById(leadId)
          .populate('statusId', 'name color')
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')
          .lean()

        // Log activity in the Activity collection for recent activity display
        try {
          await Activity.create({
            workspaceId,
            performedBy: auth.user.id,
            activityType: 'updated',
            entityType: 'lead',
            entityId: leadId,
            description: `${auth.user.fullName} updated lead "${lead.name}"`,
            metadata: {
              leadName: lead.name,
              updatedFields: Object.keys(updateData),
              changes: changes,
            },
          })
        } catch (activityError) {
          console.error('Failed to log lead update activity:', activityError)
          // Don't fail the update if activity logging fails
        }

        // Log detailed lead activity
        if (changes.length > 0) {
          try {
            const { LeadActivity } = await import('@/lib/mongodb/client')

            // Determine activity type based on changes
            let activityType: 'updated' | 'status_changed' | 'assigned' =
              'updated'
            let description = `Updated lead "${lead.name}"`

            if (changes.some(c => c.field === 'statusId')) {
              activityType = 'status_changed'
              description = `Changed status of lead "${lead.name}"`
            } else if (changes.some(c => c.field === 'assignedTo')) {
              activityType = 'assigned'
              description = `Reassigned lead "${lead.name}"`
            }

            await LeadActivity.create({
              leadId,
              workspaceId,
              activityType,
              performedBy: auth.user.id,
              description,
              changes,
              metadata: {
                leadName: lead.name,
                totalChanges: changes.length,
              },
            })
          } catch (leadActivityError) {
            console.error('Failed to log lead activity:', leadActivityError)
            // Don't fail the request if lead activity logging fails
          }
        }

        // Log the activity
        logUserActivity(auth.user.id, 'lead_updated', 'lead', {
          leadId,
          leadName: lead.name,
          updatedFields: Object.keys(updateData),
          workspaceId,
        })

        logBusinessEvent('lead_updated', auth.user.id, workspaceId, {
          leadId,
          leadName: lead.name,
          value: lead.value,
          updatedFields: Object.keys(updateData),
        })

        // Create notification for lead update (only for significant changes)
        if (changes.length > 0) {
          try {
            let notificationTitle = 'Lead Updated'
            let notificationMessage = `${auth.user.fullName || auth.user.email} updated lead: ${lead.name}`
            let notificationType: 'info' | 'success' | 'warning' = 'info'

            // Customize notification based on type of change
            const statusChange = changes.find(c => c.field === 'statusId')
            const assignmentChange = changes.find(c => c.field === 'assignedTo')

            if (statusChange) {
              notificationTitle = 'Lead Status Changed'
              notificationMessage = `${auth.user.fullName || auth.user.email} changed status of lead "${lead.name}"`
              notificationType = 'success'
            } else if (assignmentChange) {
              notificationTitle = 'Lead Reassigned'
              notificationMessage = `${auth.user.fullName || auth.user.email} reassigned lead "${lead.name}"`
              notificationType = 'info'
            }

            await NotificationService.createNotification({
              workspaceId,
              title: notificationTitle,
              message: notificationMessage,
              type: notificationType,
              entityType: 'lead',
              entityId: leadId,
              createdBy: auth.user.id,
              notificationLevel: 'team',
              excludeUserIds: [auth.user.id], // Don't notify the updater
              metadata: {
                leadName: lead.name,
                updatedFields: Object.keys(updateData),
                changes: changes,
                changeCount: changes.length,
              },
            })
          } catch (notificationError) {
            console.error(
              'Failed to create lead update notification:',
              notificationError
            )
            // Don't fail the update if notification fails
          }
        }

        log.info(`Lead updated successfully`, {
          leadId,
          workspaceId,
          updatedBy: auth.user.id,
          updatedFields: Object.keys(updateData),
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Lead updated successfully',
          lead: populatedLead,
        })
      } catch (error) {
        console.error('=== LEAD UPDATE API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Update lead error:', error)
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
      logBody: true,
      logHeaders: true,
    }
  )
)

// DELETE /api/leads/[id] - Delete a lead
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

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const { id: leadId } = await params

        if (!workspaceId || !leadId) {
          return NextResponse.json(
            { message: 'Workspace ID and Lead ID are required' },
            { status: 400 }
          )
        }

        // Verify user has access to this workspace
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

        // Check if lead exists
        const lead = await Lead.findOne({
          _id: leadId,
          workspaceId,
        })

        if (!lead) {
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

        // Delete the lead
        await Lead.findByIdAndDelete(leadId)

        logUserActivity(auth.user.id, 'lead.delete', 'lead', {
          workspaceId,
          leadId,
          leadName: lead.name,
        })

        logBusinessEvent('lead_deleted', auth.user.id, workspaceId, {
          leadId,
          leadName: lead.name,
        })

        return NextResponse.json({
          success: true,
          message: 'Lead deleted successfully',
        })
      } catch (error) {
        log.error('Delete lead error:', error)
        return NextResponse.json({ message: 'Server error' }, { status: 500 })
      }
    }
  )
)
