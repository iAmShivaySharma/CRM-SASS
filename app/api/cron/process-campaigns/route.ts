import { type NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Campaign, CampaignEnrollment } from '@/lib/mongodb/models/Campaign'
import {
  EmailSequence,
  SequenceEnrollment,
} from '@/lib/mongodb/models/EmailSequence'
import { WhatsAppService } from '@/lib/services/whatsappService'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { SmsService } from '@/lib/services/smsService'
import { log } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectToMongoDB()

    const now = new Date()
    let campaignProcessed = 0
    let sequenceProcessed = 0

    const dueEnrollments = await CampaignEnrollment.find({
      status: 'active',
      nextSendAt: { $lte: now },
    }).limit(50)

    for (const enrollment of dueEnrollments) {
      try {
        const campaign = await Campaign.findById(enrollment.campaignId)
        if (!campaign || campaign.status !== 'active') {
          enrollment.status = 'paused'
          await enrollment.save()
          continue
        }

        const steps = campaign.steps.sort((a: any, b: any) => a.order - b.order)
        const step = steps[enrollment.currentStep]

        if (!step) {
          enrollment.status = 'completed'
          enrollment.completedAt = now
          await enrollment.save()
          await Campaign.findByIdAndUpdate(enrollment.campaignId, {
            $inc: { completedCount: 1 },
          })
          continue
        }

        let sent = false

        if (step.channel === 'email' && enrollment.email) {
          try {
            const { emailService } = await import('@/lib/services/emailService')
            await emailService.sendEmail({
              to: enrollment.email,
              subject: step.subject || 'Campaign Message',
              html: step.body,
            })
            sent = true
          } catch (err) {
            log.error('Campaign email send failed', {
              err,
              enrollmentId: enrollment._id,
            })
          }
        } else if (step.channel === 'whatsapp' && enrollment.phone) {
          try {
            const account = await WhatsAppAccount.findOne({
              workspaceId: enrollment.workspaceId,
              isActive: true,
            })
            if (account) {
              await WhatsAppService.sendTextMessage({
                workspaceId: enrollment.workspaceId,
                accountId: account._id.toString(),
                to: enrollment.phone,
                text: step.body,
              })
              sent = true
            }
          } catch (err) {
            log.error('Campaign whatsapp send failed', {
              err,
              enrollmentId: enrollment._id,
            })
          }
        } else if (step.channel === 'sms' && enrollment.phone) {
          try {
            await SmsService.sendSms({
              workspaceId: enrollment.workspaceId,
              to: enrollment.phone,
              message: step.body,
              sentBy: 'system',
            })
            sent = true
          } catch (err) {
            log.error('Campaign sms send failed', {
              err,
              enrollmentId: enrollment._id,
            })
          }
        } else if (step.channel === 'ai_reply' && enrollment.phone) {
          try {
            const appUrl =
              process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const aiRes = await fetch(`${appUrl}/api/ai/auto-reply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                incomingMessage: step.body,
                channel: step.replyViaChannel || 'whatsapp',
                tone: step.aiTone || 'professional',
                businessContext: step.aiContext || '',
              }),
            })
            if (aiRes.ok) {
              const { reply } = await aiRes.json()
              if (reply) {
                const replyChannel = step.replyViaChannel || 'whatsapp'
                if (replyChannel === 'whatsapp') {
                  const account = await WhatsAppAccount.findOne({
                    workspaceId: enrollment.workspaceId,
                    isActive: true,
                  })
                  if (account) {
                    await WhatsAppService.sendTextMessage({
                      workspaceId: enrollment.workspaceId,
                      accountId: account._id.toString(),
                      to: enrollment.phone,
                      text: reply,
                    })
                  }
                } else if (replyChannel === 'sms') {
                  await SmsService.sendSms({
                    workspaceId: enrollment.workspaceId,
                    to: enrollment.phone,
                    message: reply,
                    sentBy: 'system',
                  })
                }
                sent = true
              }
            }
          } catch (err) {
            log.error('Campaign ai_reply send failed', {
              err,
              enrollmentId: enrollment._id,
            })
          }
        }

        if (sent) {
          const nextStepIndex = enrollment.currentStep + 1
          if (nextStepIndex >= steps.length) {
            enrollment.status = 'completed'
            enrollment.completedAt = now
            await Campaign.findByIdAndUpdate(enrollment.campaignId, {
              $inc: { completedCount: 1 },
            })
          } else {
            const nextStep = steps[nextStepIndex]
            const delayMs =
              (nextStep.delayDays || 0) * 86400000 +
              (nextStep.delayHours || 0) * 3600000
            enrollment.currentStep = nextStepIndex
            enrollment.nextSendAt = new Date(Date.now() + delayMs)
          }
          await enrollment.save()
          campaignProcessed++
        }
      } catch (err) {
        log.error('Campaign enrollment processing error', {
          err,
          enrollmentId: enrollment._id,
        })
      }
    }

    const dueSequences = await SequenceEnrollment.find({
      status: 'active',
      nextSendAt: { $lte: now },
    }).limit(50)

    for (const enrollment of dueSequences) {
      try {
        const sequence = await EmailSequence.findById(enrollment.sequenceId)
        if (!sequence || sequence.status !== 'active') {
          enrollment.status = 'paused'
          await enrollment.save()
          continue
        }

        const steps = sequence.steps.sort((a: any, b: any) => a.order - b.order)
        const step = steps[enrollment.currentStep]

        if (!step) {
          enrollment.status = 'completed'
          enrollment.completedAt = now
          await enrollment.save()
          continue
        }

        const channel = step.channel || 'email'
        let sent = false

        if (channel === 'email' && enrollment.email) {
          try {
            const { emailService } = await import('@/lib/services/emailService')
            await emailService.sendEmail({
              to: enrollment.email,
              subject: step.subject || 'Sequence Message',
              html: step.body,
            })
            sent = true
          } catch (err) {
            log.error('Sequence email send failed', { err })
          }
        } else if (channel === 'whatsapp' && enrollment.phone) {
          try {
            const account = await WhatsAppAccount.findOne({
              workspaceId: enrollment.workspaceId,
              isActive: true,
            })
            if (account) {
              await WhatsAppService.sendTextMessage({
                workspaceId: enrollment.workspaceId,
                accountId: account._id.toString(),
                to: enrollment.phone,
                text: step.body,
              })
              sent = true
            }
          } catch (err) {
            log.error('Sequence whatsapp send failed', { err })
          }
        } else if (channel === 'sms' && enrollment.phone) {
          try {
            await SmsService.sendSms({
              workspaceId: enrollment.workspaceId,
              to: enrollment.phone,
              message: step.body,
              sentBy: 'system',
            })
            sent = true
          } catch (err) {
            log.error('Sequence sms send failed', { err })
          }
        }

        if (sent) {
          const nextStepIndex = enrollment.currentStep + 1
          if (nextStepIndex >= steps.length) {
            enrollment.status = 'completed'
            enrollment.completedAt = now
          } else {
            const nextStep = steps[nextStepIndex]
            const delayMs =
              (nextStep.delayDays || 0) * 86400000 +
              (nextStep.delayHours || 0) * 3600000
            enrollment.currentStep = nextStepIndex
            enrollment.nextSendAt = new Date(Date.now() + delayMs)
          }
          await enrollment.save()
          sequenceProcessed++
        }
      } catch (err) {
        log.error('Sequence enrollment processing error', { err })
      }
    }

    return NextResponse.json({
      success: true,
      processed: { campaigns: campaignProcessed, sequences: sequenceProcessed },
      timestamp: now.toISOString(),
    })
  } catch (err) {
    log.error('Cron process-campaigns error', { err })
    return NextResponse.json({ message: 'Processing failed' }, { status: 500 })
  }
}
