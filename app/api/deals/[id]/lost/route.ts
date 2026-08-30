import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Deal,
  PipelineStage,
  DealActivity,
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

const lostDealSchema = z.object({
  workspaceId: z.string().min(1),
  lostReason: z.string().max(500).optional(),
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

        const validationResult = lostDealSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId, lostReason } = validationResult.data

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

        if (deal.status === 'lost') {
          return NextResponse.json(
            { message: 'Deal is already lost' },
            { status: 400 }
          )
        }

        const lostStage = await PipelineStage.findOne({
          pipelineId: deal.pipelineId,
          isLostStage: true,
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

        if (lostStage) {
          deal.stageId = lostStage._id.toString()
          deal.stageHistory.push({
            stageId: lostStage._id.toString(),
            stageName: lostStage.name,
            enteredAt: now,
          })
        }

        deal.status = 'lost'
        deal.probability = 0
        deal.actualCloseDate = now
        deal.lostReason = lostReason

        await deal.save()

        await DealActivity.create({
          workspaceId,
          dealId: id,
          type: 'lost',
          description: `Deal lost${lostReason ? `: ${lostReason}` : ''}`,
          metadata: { lostReason, value: deal.value },
          performedBy: auth.user.id,
        })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'updated',
          entityType: 'deal',
          entityId: id,
          description: `Lost deal "${deal.title}"${lostReason ? ` — ${lostReason}` : ''}`,
        })

        await NotificationService.createNotification({
          workspaceId,
          title: 'Deal Lost',
          message: `${auth.user.fullName || auth.user.email} marked "${deal.title}" as lost${lostReason ? ` — ${lostReason}` : ''}`,
          type: 'warning',
          entityType: 'deal',
          entityId: id,
          createdBy: auth.user.id,
          notificationLevel: 'team',
        }).catch(() => {})

        logBusinessEvent('deal_lost', auth.user.id, workspaceId, {
          dealId: id,
          title: deal.title,
          value: deal.value,
          lostReason,
        })

        return NextResponse.json({
          success: true,
          message: 'Deal marked as lost',
          deal: deal.toJSON(),
        })
      } catch (error) {
        log.error('Lost deal error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
