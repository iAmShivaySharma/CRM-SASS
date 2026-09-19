import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await connectToMongoDB()

    const { Campaign, CampaignEnrollment } =
      await import('@/lib/mongodb/models/Campaign')
    const { EmailSequence, SequenceEnrollment } =
      await import('@/lib/mongodb/models/EmailSequence')
    const { WhatsAppService } = await import('@/lib/services/whatsappService')
    const { WhatsAppAccount } =
      await import('@/lib/mongodb/models/WhatsAppAccount')
    const { SmsService } = await import('@/lib/services/smsService')

    const now = new Date()
    let campaignProcessed = 0
    let sequenceProcessed = 0
    const errors: string[] = []

    const dueEnrollments = await CampaignEnrollment.find({
      status: 'active',
      nextSendAt: { $lte: now },
    }).limit(50)

    for (const enrollment of dueEnrollments) {
      try {
        const campaign = await Campaign.findById(enrollment.campaignId)
        if (!campaign || campaign.status !== 'active') {
          await CampaignEnrollment.findByIdAndUpdate(enrollment._id, {
            $set: { status: 'paused' },
          })
          continue
        }

        const steps = campaign.steps.sort((a: any, b: any) => a.order - b.order)
        const step = steps[enrollment.currentStep]

        if (!step) {
          await CampaignEnrollment.findByIdAndUpdate(enrollment._id, {
            $set: { status: 'completed', completedAt: now },
          })
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
            log.error('Campaign email failed', { err })
          }
        } else if (step.channel === 'whatsapp' && enrollment.phone) {
          try {
            const account = await WhatsAppAccount.findOne({
              workspaceId: enrollment.workspaceId,
              isActive: true,
            })
            if (account) {
              const { WhatsAppTemplate } =
                await import('@/lib/mongodb/models/WhatsAppTemplate')
              const tmpl = await WhatsAppTemplate.findOne({
                workspaceId: enrollment.workspaceId,
                name: step.body,
                status: 'APPROVED',
              })
              if (tmpl) {
                const result = await WhatsAppService.sendTemplateMessage({
                  workspaceId: enrollment.workspaceId,
                  accountId: account._id.toString(),
                  to: enrollment.phone,
                  templateName: step.body,
                  language: tmpl.language,
                })
                sent = result.success
                if (!result.success) {
                  errors.push(
                    `WA template to ${enrollment.phone}: ${result.error}`
                  )
                }
              } else {
                await WhatsAppService.sendTextMessage({
                  workspaceId: enrollment.workspaceId,
                  accountId: account._id.toString(),
                  to: enrollment.phone,
                  text: step.body,
                })
                sent = true
              }
            }
          } catch (err: any) {
            log.error('Campaign whatsapp failed', { err })
            errors.push(`WA: ${err?.message || 'unknown'}`)
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
            log.error('Campaign sms failed', { err })
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
            log.error('Campaign ai_reply failed', { err })
          }
        }

        if (sent) {
          const nextStepIndex = enrollment.currentStep + 1
          if (nextStepIndex >= steps.length) {
            await CampaignEnrollment.findByIdAndUpdate(enrollment._id, {
              $set: { status: 'completed', completedAt: now },
            })
            await Campaign.findByIdAndUpdate(enrollment.campaignId, {
              $inc: { completedCount: 1 },
            })
          } else {
            const nextStep = steps[nextStepIndex]
            const delayMs =
              (nextStep.delayDays || 0) * 86400000 +
              (nextStep.delayHours || 0) * 3600000
            await CampaignEnrollment.findByIdAndUpdate(enrollment._id, {
              $set: {
                currentStep: nextStepIndex,
                nextSendAt: new Date(Date.now() + delayMs),
              },
            })
          }
          campaignProcessed++
        }
      } catch (err) {
        log.error('Campaign enrollment error', { err })
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
          await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
            $set: { status: 'paused' },
          })
          continue
        }

        const steps = sequence.steps.sort((a: any, b: any) => a.order - b.order)
        const step = steps[enrollment.currentStep]
        if (!step) {
          await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
            $set: { status: 'completed', completedAt: now },
          })
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
            log.error('Sequence email failed', { err })
          }
        } else if (channel === 'whatsapp' && enrollment.phone) {
          try {
            const account = await WhatsAppAccount.findOne({
              workspaceId: enrollment.workspaceId,
              isActive: true,
            })
            if (account) {
              const { WhatsAppTemplate } =
                await import('@/lib/mongodb/models/WhatsAppTemplate')
              const tmpl = await WhatsAppTemplate.findOne({
                workspaceId: enrollment.workspaceId,
                name: step.body,
                status: 'APPROVED',
              })
              if (tmpl) {
                const result = await WhatsAppService.sendTemplateMessage({
                  workspaceId: enrollment.workspaceId,
                  accountId: account._id.toString(),
                  to: enrollment.phone,
                  templateName: step.body,
                  language: tmpl.language,
                })
                sent = result.success
                if (!result.success) {
                  errors.push(
                    `WA template to ${enrollment.phone}: ${result.error}`
                  )
                }
              } else {
                await WhatsAppService.sendTextMessage({
                  workspaceId: enrollment.workspaceId,
                  accountId: account._id.toString(),
                  to: enrollment.phone,
                  text: step.body,
                })
                sent = true
              }
            }
          } catch (err) {
            log.error('Sequence whatsapp failed', { err })
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
            log.error('Sequence sms failed', { err })
          }
        }

        if (sent) {
          const nextStepIndex = enrollment.currentStep + 1
          if (nextStepIndex >= steps.length) {
            await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
              $set: { status: 'completed', completedAt: now },
            })
          } else {
            const nextStep = steps[nextStepIndex]
            const delayMs =
              (nextStep.delayDays || 0) * 86400000 +
              (nextStep.delayHours || 0) * 3600000
            await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
              $set: {
                currentStep: nextStepIndex,
                nextSendAt: new Date(Date.now() + delayMs),
              },
            })
          }
          sequenceProcessed++
        }
      } catch (err) {
        log.error('Sequence enrollment error', { err })
      }
    }

    return NextResponse.json({
      success: true,
      processed: { campaigns: campaignProcessed, sequences: sequenceProcessed },
      found: {
        campaigns: dueEnrollments.length,
        sequences: dueSequences.length,
      },
      errors,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    log.error('Cron error', { err })
    return NextResponse.json(
      { message: 'Processing failed', error: err?.message },
      { status: 500 }
    )
  }
}
