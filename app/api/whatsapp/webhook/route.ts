import { type NextRequest, NextResponse } from 'next/server'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import { WhatsAppService } from '@/lib/services/whatsappService'
import { Lead } from '@/lib/mongodb/client'
import { NotificationService } from '@/lib/services/notificationService'

// Webhook verification (GET)
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

// Webhook events (POST)
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

        // Handle status updates
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

        // Handle incoming messages
        if (value.messages) {
          for (const msg of value.messages) {
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
              if (account) {
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

                if (account.botEnabled && content && msg.type === 'text') {
                  const appUrl =
                    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                  const aiRes = await fetch(`${appUrl}/api/ai/auto-reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message: content,
                      senderName: msg.from,
                      businessName: account.displayName,
                      channel: 'whatsapp',
                      tone: account.botTone || 'professional',
                      businessContext: account.botContext || '',
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

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    log.error('WhatsApp webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}
