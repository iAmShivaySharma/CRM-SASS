import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Deal, PipelineStage, DealActivity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'

const moveDealSchema = z.object({
  stageId: z.string().min(1),
  workspaceId: z.string().min(1),
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

        const validationResult = moveDealSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { stageId, workspaceId } = validationResult.data

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

        if (deal.stageId === stageId) {
          return NextResponse.json({
            success: true,
            message: 'Deal is already in this stage',
            deal: deal.toJSON(),
          })
        }

        const newStage = await PipelineStage.findOne({
          _id: stageId,
          pipelineId: deal.pipelineId,
          isActive: true,
        })
        if (!newStage) {
          return NextResponse.json(
            { message: 'Stage not found in this pipeline' },
            { status: 404 }
          )
        }

        const oldStageId = deal.stageId
        const oldStage = await PipelineStage.findById(oldStageId).lean()
        const oldStageName = (oldStage as any)?.name || 'Unknown'

        const now = new Date()

        // Close previous stage history entry
        if (deal.stageHistory && deal.stageHistory.length > 0) {
          const lastEntry = deal.stageHistory[deal.stageHistory.length - 1]
          if (!lastEntry.exitedAt) {
            lastEntry.exitedAt = now
            lastEntry.duration =
              now.getTime() - new Date(lastEntry.enteredAt).getTime()
          }
        }

        deal.stageId = stageId
        deal.probability = newStage.probability
        deal.stageEnteredAt = now
        deal.stageHistory.push({
          stageId,
          stageName: newStage.name,
          enteredAt: now,
        })

        // Auto-set status for won/lost stages
        if (newStage.isWonStage) {
          deal.status = 'won'
          deal.actualCloseDate = now
        } else if (newStage.isLostStage) {
          deal.status = 'lost'
          deal.actualCloseDate = now
        } else if (deal.status !== 'open') {
          deal.status = 'open'
          deal.actualCloseDate = undefined
        }

        await deal.save()

        await DealActivity.create({
          workspaceId,
          dealId: id,
          type: 'stage_changed',
          description: `Moved from "${oldStageName}" to "${newStage.name}"`,
          metadata: {
            fromStageId: oldStageId,
            fromStageName: oldStageName,
            toStageId: stageId,
            toStageName: newStage.name,
          },
          performedBy: auth.user.id,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'Deal Stage Changed',
          message: `${auth.user.fullName || auth.user.email} moved "${deal.title}" to ${newStage.name}`,
          type: 'info',
          entityType: 'deal',
          entityId: id,
          createdBy: auth.user.id,
          notificationLevel: 'team',
          excludeUserIds: [auth.user.id],
        }).catch(() => {})

        logBusinessEvent('deal_stage_changed', auth.user.id, workspaceId, {
          dealId: id,
          fromStage: oldStageName,
          toStage: newStage.name,
          value: deal.value,
        })

        const populatedDeal = await Deal.findById(id)
          .populate('contactId', 'name email phone company')
          .populate('assignedTo', 'fullName email')
          .populate('stageId', 'name color probability')
          .populate('tagIds', 'name color')

        return NextResponse.json({
          success: true,
          message: `Deal moved to ${newStage.name}`,
          deal: populatedDeal?.toJSON(),
        })
      } catch (error) {
        log.error('Move deal error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
