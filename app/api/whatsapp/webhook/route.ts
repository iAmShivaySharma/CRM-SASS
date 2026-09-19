import { type NextRequest, NextResponse } from 'next/server'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { WhatsAppMessage } from '@/lib/mongodb/models/WhatsAppMessage'
import { WhatsAppConversation } from '@/lib/mongodb/models/WhatsAppConversation'
import { Lead } from '@/lib/mongodb/models/Lead'
import { Contact } from '@/lib/mongodb/models/Contact'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { WhatsAppService } from '@/lib/services/whatsappService'
import { NotificationService } from '@/lib/services/notificationService'
import { BotFlowEngine } from '@/lib/services/botFlowEngine'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe') {
    await connectToMongoDB()

    const account = await WhatsAppAccount.findOne({
      webhookVerifyToken: token,
      isActive: true,
    })

    if (account) {
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
}

async function linkMessageToLeadOrContact(
  workspaceId: string,
  phone: string,
  messageId: string,
  conversationId: string
) {
  const normalizedPhone = WhatsAppService.formatPhone(phone)

  const phoneVariants = [
    normalizedPhone,
    `+${normalizedPhone}`,
    normalizedPhone.replace(/^91/, ''),
    normalizedPhone.replace(/^91/, '0'),
  ]

  const lead = await Lead.findOne({
    workspaceId,
    phone: { $in: phoneVariants },
  }).lean()

  if (lead) {
    await WhatsAppMessage.findByIdAndUpdate(messageId, {
      $set: { leadId: (lead as any)._id.toString() },
    })
    await WhatsAppConversation.findByIdAndUpdate(conversationId, {
      $set: { contactName: (lead as any).name },
    })
    return
  }

  const contact = await Contact.findOne({
    workspaceId,
    phone: { $in: phoneVariants },
  }).lean()

  if (contact) {
    await WhatsAppMessage.findByIdAndUpdate(messageId, {
      $set: { contactId: (contact as any)._id.toString() },
    })
    await WhatsAppConversation.findByIdAndUpdate(conversationId, {
      $set: { contactName: (contact as any).name },
    })
  }
}

async function buildConversationHistory(
  workspaceId: string,
  phone: string,
  accountPhone: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const recentMessages = await WhatsAppMessage.find({
    workspaceId,
    $or: [
      { from: phone, to: accountPhone },
      { from: accountPhone, to: phone },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()

  return recentMessages
    .reverse()
    .map((m: any) => ({
      role:
        m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: m.content || '',
    }))
    .filter(m => m.content)
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const body = await request.json()

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ok' })
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue

        const value = change.value
        const phoneNumberId = value.metadata?.phone_number_id

        if (value.statuses) {
          for (const status of value.statuses) {
            await WhatsAppService.handleWebhookStatus({
              waMessageId: status.id,
              status: status.status,
              timestamp: parseInt(status.timestamp),
              errorCode: status.errors?.[0]?.code?.toString(),
              errorMessage: status.errors?.[0]?.title,
            })
          }
        }

        if (value.messages) {
          for (const msg of value.messages) {
            const existing = await WhatsAppMessage.findOne({
              waMessageId: msg.id,
            })
            if (existing) {
              continue
            }

            let content = ''
            const messageType = msg.type

            switch (msg.type) {
              case 'text':
                content = msg.text?.body || ''
                break
              case 'image':
              case 'video':
              case 'audio':
              case 'document':
                content = msg[msg.type]?.caption || `[${msg.type}]`
                break
              case 'button':
                content = msg.button?.text || msg.button?.payload || ''
                break
              case 'interactive':
                content =
                  msg.interactive?.button_reply?.title ||
                  msg.interactive?.list_reply?.title ||
                  msg.interactive?.list_reply?.id ||
                  '[interactive]'
                break
              case 'location':
                content = `Location: ${msg.location?.latitude}, ${msg.location?.longitude}`
                break
              default:
                content = `[${msg.type} message]`
            }

            const message = await WhatsAppService.handleIncomingMessage({
              accountId: phoneNumberId,
              from: msg.from,
              messageType,
              content,
              waMessageId: msg.id,
              mediaId: msg[msg.type]?.id,
              timestamp: parseInt(msg.timestamp),
            })

            if (message) {
              const account = await WhatsAppAccount.findOne({ phoneNumberId })
              if (!account) {
                continue
              }

              const contactName =
                value.contacts?.[0]?.profile?.name || undefined

              const conversation = await WhatsAppConversation.findOneAndUpdate(
                {
                  workspaceId: account.workspaceId,
                  accountId: account._id.toString(),
                  contactPhone: msg.from,
                },
                {
                  $set: {
                    lastInboundAt: new Date(),
                    lastMessagePreview: content.substring(0, 200),
                    status: 'active',
                    ...(contactName ? { contactName } : {}),
                  },
                  $inc: { unreadCount: 1 },
                  $setOnInsert: {
                    mode: account.botEnabled ? 'ai' : 'idle',
                    aiEnabled: account.botEnabled,
                    metadata: {},
                  },
                },
                { upsert: true, new: true }
              )

              linkMessageToLeadOrContact(
                account.workspaceId,
                msg.from,
                message._id.toString(),
                conversation._id.toString()
              ).catch(() => {})

              const { CampaignEnrollment } =
                await import('@/lib/mongodb/models/Campaign')
              const normalizedPhone = WhatsAppService.formatPhone(msg.from)
              await CampaignEnrollment.updateMany(
                {
                  workspaceId: account.workspaceId,
                  phone: {
                    $in: [msg.from, normalizedPhone, `+${normalizedPhone}`],
                  },
                  status: 'active',
                },
                { $set: { status: 'completed', completedAt: new Date() } }
              ).catch(() => {})

              await NotificationService.createNotification({
                workspaceId: account.workspaceId,
                title: 'New WhatsApp Message',
                message: `From ${msg.from}: ${content.substring(0, 100)}`,
                type: 'info',
                entityType: 'whatsapp_message',
                entityId: message._id.toString(),
                createdBy: 'system',
                notificationLevel: 'team',
              }).catch(() => {})

              if (conversation.mode === 'human') {
                if (conversation.humanAssignedTo) {
                  await NotificationService.createNotification({
                    workspaceId: account.workspaceId,
                    title: 'WhatsApp: Message in your conversation',
                    message: `${contactName || msg.from}: ${content.substring(0, 100)}`,
                    type: 'info',
                    entityType: 'whatsapp_message',
                    entityId: message._id.toString(),
                    createdBy: 'system',
                    targetUserIds: [conversation.humanAssignedTo],
                    notificationLevel: 'personal',
                  }).catch(() => {})
                }
              } else if (
                conversation.mode === 'workflow' ||
                conversation.mode === 'ai' ||
                conversation.mode === 'idle'
              ) {
                if (
                  content &&
                  (msg.type === 'text' ||
                    msg.type === 'interactive' ||
                    msg.type === 'button')
                ) {
                  const botResult = await BotFlowEngine.processMessage({
                    workspaceId: account.workspaceId,
                    accountId: account._id.toString(),
                    contactPhone: msg.from,
                    messageContent: content,
                    conversation,
                  }).catch(err => {
                    log.error('Bot flow engine error:', err)
                    return { handled: false } as {
                      handled: boolean
                      response?: string
                    }
                  })

                  if (
                    !botResult.handled &&
                    conversation.mode !== 'idle' &&
                    msg.type === 'text'
                  ) {
                    const conversationHistory = await buildConversationHistory(
                      account.workspaceId,
                      msg.from,
                      account.phoneNumber
                    )

                    const appUrl =
                      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                    const aiRes = await fetch(`${appUrl}/api/ai/auto-reply`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        workspaceId: account.workspaceId,
                        incomingMessage: content,
                        senderName: contactName || msg.from,
                        businessName: account.displayName,
                        channel: 'whatsapp',
                        tone: account.botTone || 'professional',
                        businessContext:
                          botResult.response || account.botContext || '',
                        conversationHistory,
                      }),
                    }).catch(() => null)

                    if (aiRes?.ok) {
                      const { reply } = await aiRes.json().catch(() => ({}))
                      if (reply) {
                        await WhatsAppService.sendTextMessage({
                          workspaceId: account.workspaceId,
                          accountId: account._id.toString(),
                          to: msg.from,
                          text: reply,
                        }).catch(() => {})
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    log.error('WhatsApp webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}
