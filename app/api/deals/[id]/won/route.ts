import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Deal,
  PipelineStage,
  DealActivity,
  Contact,
  Activity,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'

const wonDealSchema = z.object({
  workspaceId: z.string().min(1),
  wonNote: z.string().max(500).optional(),
  actualValue: z.number().min(0).optional(),
})

export const POST = withSecurityLogging(
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

        const validationResult = wonDealSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId, wonNote, actualValue } = validationResult.data

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

        if (deal.status === 'won') {
          return NextResponse.json(
            { message: 'Deal is already won' },
            { status: 400 }
          )
        }

        const wonStage = await PipelineStage.findOne({
          pipelineId: deal.pipelineId,
          isWonStage: true,
          isActive: true,
        })

        const now = new Date()

        if (deal.stageHistory && deal.stageHistory.length > 0) {
          const lastEntry = deal.stageHistory[deal.stageHistory.length - 1]
          if (!lastEntry.exitedAt) {
            lastEntry.exitedAt = now
            lastEntry.duration =
              now.getTime() - new Date(lastEntry.enteredAt).getTime()
          }
        }

        if (wonStage) {
          deal.stageId = wonStage._id.toString()
          deal.stageHistory.push({
            stageId: wonStage._id.toString(),
            stageName: wonStage.name,
            enteredAt: now,
          })
        }

        deal.status = 'won'
        deal.probability = 100
        deal.actualCloseDate = now
        deal.wonNote = wonNote
        if (actualValue !== undefined) deal.value = actualValue

        await deal.save()

        // Update contact revenue if linked
        if (deal.contactId) {
          await Contact.findByIdAndUpdate(deal.contactId, {
            $inc: { totalRevenue: deal.value },
          })
        }

        await DealActivity.create({
          workspaceId,
          dealId: id,
          type: 'won',
          description: `Deal won! Value: ₹${deal.value.toLocaleString()}`,
          metadata: { value: deal.value, wonNote },
          performedBy: auth.user.id,
        })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'deal',
          entityId: id,
          description: `Won deal "${deal.title}" (₹${deal.value.toLocaleString()})`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'Deal Won! 🎉',
          message: `${auth.user.fullName || auth.user.email} won the deal "${deal.title}" worth ₹${deal.value.toLocaleString()}`,
          type: 'success',
          entityType: 'deal',
          entityId: id,
          createdBy: auth.user.id,
          notificationLevel: 'team',
        }).catch(() => {})

        logBusinessEvent('deal_won', auth.user.id, workspaceId, {
          dealId: id,
          title: deal.title,
          value: deal.value,
        })

        return NextResponse.json({
          success: true,
          message: 'Deal marked as won',
          deal: deal.toJSON(),
        })
      } catch (error) {
        log.error('Won deal error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
