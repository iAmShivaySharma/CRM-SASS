import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
import { invalidateCache } from '@/lib/redis/cache'

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
  customFields: z.record(z.any()).optional(),
  customData: z.record(z.any()).optional(),
})

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id: leadId } = await params
        const body = await request.json()

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateLeadSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const updateData = validationResult.data

        const userMembership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        }).lean()

        if (!userMembership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        if (updateData.statusId && updateData.statusId !== '') {
          const { LeadStatus } = await import('@/lib/mongodb/client')
          const statusExists = await LeadStatus.findOne({
            _id: updateData.statusId,
            workspaceId,
          }).lean()
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
          }).lean()
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
          }).lean()
          if (!assignedUserMembership) {
            return NextResponse.json(
              { message: 'Invalid assigned user ID' },
              { status: 400 }
            )
          }
        }

        const lead = await Lead.findOne({ _id: leadId, workspaceId })
        if (!lead) {
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

        const changes: { field: string; oldValue: any; newValue: any }[] = []
        const originalLead = lead.toObject()

        if (updateData.customFields) {
          const oldCustomData = { ...lead.customData }
          lead.customData = { ...lead.customData, ...updateData.customFields }

          Object.keys(updateData.customFields).forEach(key => {
            if (oldCustomData[key] !== updateData.customFields![key]) {
              changes.push({
                field: `customFields.${key}`,
                oldValue: oldCustomData[key],
                newValue: updateData.customFields![key],
              })
            }
          })

          delete updateData.customFields
        }

        if (updateData.customData) {
          const oldCustomData = { ...lead.customData }
          lead.customData = { ...lead.customData, ...updateData.customData }

          Object.keys(updateData.customData).forEach(key => {
            if (oldCustomData[key] !== updateData.customData![key]) {
              changes.push({
                field: `customData.${key}`,
                oldValue: oldCustomData[key],
                newValue: updateData.customData![key],
              })
            }
          })

          delete updateData.customData
        }

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
        await lead.save()

        const populatedLead = await Lead.findById(leadId)
          .populate('statusId', 'name color')
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')
          .lean()

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
        } catch (activityError) {}

        if (changes.length > 0) {
          try {
            const { LeadActivity } = await import('@/lib/mongodb/client')

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
          } catch (leadActivityError) {}
        }

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

        if (changes.length > 0) {
          try {
            let notificationTitle = 'Lead Updated'
            let notificationMessage = `${auth.user.fullName || auth.user.email} updated lead: ${lead.name}`
            let notificationType: 'info' | 'success' | 'warning' = 'info'

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
              excludeUserIds: [auth.user.id],
              metadata: {
                leadName: lead.name,
                updatedFields: Object.keys(updateData),
                changes: changes,
                changeCount: changes.length,
              },
            })
          } catch (notificationError) {}
        }

        log.info(`Lead updated successfully`, {
          leadId,
          workspaceId,
          updatedBy: auth.user.id,
          updatedFields: Object.keys(updateData),
          duration: Date.now() - startTime,
        })

        await invalidateCache('leads:' + workspaceId + ':*')

        return NextResponse.json({
          success: true,
          message: 'Lead updated successfully',
          lead: populatedLead,
        })
      } catch (error) {
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

        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        }).lean()

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const lead = await Lead.findOne({
          _id: leadId,
          workspaceId,
        }).lean()

        if (!lead) {
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

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

        await invalidateCache('leads:' + workspaceId + ':*')

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
