import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { WhatsAppMessage } from '@/lib/mongodb/models/WhatsAppMessage'
import { WhatsAppTemplate } from '@/lib/mongodb/models/WhatsAppTemplate'
import { log } from '@/lib/logging/logger'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

interface SendMessageResult {
  success: boolean
  messageId?: string
  waMessageId?: string
  error?: string
}

export class WhatsAppService {
  static async sendTextMessage(params: {
    workspaceId: string
    accountId: string
    to: string
    text: string
    contactId?: string
    leadId?: string
    sentBy?: string
  }): Promise<SendMessageResult> {
    const account = await WhatsAppAccount.findOne({
      _id: params.accountId,
      workspaceId: params.workspaceId,
      isActive: true,
    })

    if (!account) {
      return { success: false, error: 'WhatsApp account not found or inactive' }
    }

    const phone = this.formatPhone(params.to)

    const msgDoc = await WhatsAppMessage.create({
      workspaceId: params.workspaceId,
      accountId: params.accountId,
      direction: 'outbound',
      from: account.phoneNumber,
      to: phone,
      messageType: 'text',
      content: params.text,
      status: 'pending',
      contactId: params.contactId,
      leadId: params.leadId,
      sentAt: new Date(),
    })

    try {
      const response = await fetch(
        `${META_API_BASE}/${account.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${account.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { body: params.text },
          }),
        }
      )

      const data = await response.json()

      if (data.messages?.[0]?.id) {
        msgDoc.status = 'sent'
        msgDoc.waMessageId = data.messages[0].id
        await msgDoc.save()

        account.dailyMessageCount += 1
        await account.save()

        return {
          success: true,
          messageId: msgDoc._id.toString(),
          waMessageId: data.messages[0].id,
        }
      }

      const errorMsg =
        data.error?.message ||
        data.error?.error_data?.details ||
        'Unknown error'
      msgDoc.status = 'failed'
      msgDoc.errorCode = data.error?.code?.toString()
      msgDoc.errorMessage = errorMsg
      await msgDoc.save()

      return {
        success: false,
        messageId: msgDoc._id.toString(),
        error: errorMsg,
      }
    } catch (error: any) {
      msgDoc.status = 'failed'
      msgDoc.errorMessage = error.message
      await msgDoc.save()

      log.error('WhatsApp send error:', error)
      return {
        success: false,
        messageId: msgDoc._id.toString(),
        error: error.message,
      }
    }
  }

  static async sendTemplateMessage(params: {
    workspaceId: string
    accountId: string
    to: string
    templateName: string
    language?: string
    variables?: string[]
    contactId?: string
    leadId?: string
  }): Promise<SendMessageResult> {
    const account = await WhatsAppAccount.findOne({
      _id: params.accountId,
      workspaceId: params.workspaceId,
      isActive: true,
    })

    if (!account) {
      return { success: false, error: 'WhatsApp account not found or inactive' }
    }

    const template = await WhatsAppTemplate.findOne({
      accountId: params.accountId,
      name: params.templateName,
      status: 'APPROVED',
      isActive: true,
    })

    if (!template) {
      return { success: false, error: 'Template not found or not approved' }
    }

    const phone = this.formatPhone(params.to)

    // Build template components
    const components: any[] = []
    if (params.variables && params.variables.length > 0) {
      components.push({
        type: 'body',
        parameters: params.variables.map(v => ({
          type: 'text',
          text: v,
        })),
      })
    }

    const msgDoc = await WhatsAppMessage.create({
      workspaceId: params.workspaceId,
      accountId: params.accountId,
      direction: 'outbound',
      from: account.phoneNumber,
      to: phone,
      messageType: 'template',
      content: template.bodyText,
      templateName: params.templateName,
      templateVariables: params.variables,
      status: 'pending',
      contactId: params.contactId,
      leadId: params.leadId,
      sentAt: new Date(),
    })

    try {
      const response = await fetch(
        `${META_API_BASE}/${account.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${account.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: params.templateName,
              language: {
                code: params.language || template.language || 'en',
              },
              components: components.length > 0 ? components : undefined,
            },
          }),
        }
      )

      const data = await response.json()

      if (data.messages?.[0]?.id) {
        msgDoc.status = 'sent'
        msgDoc.waMessageId = data.messages[0].id
        await msgDoc.save()

        template.usageCount += 1
        await template.save()

        account.dailyMessageCount += 1
        await account.save()

        return {
          success: true,
          messageId: msgDoc._id.toString(),
          waMessageId: data.messages[0].id,
        }
      }

      const errorMsg = data.error?.message || 'Unknown error'
      msgDoc.status = 'failed'
      msgDoc.errorCode = data.error?.code?.toString()
      msgDoc.errorMessage = errorMsg
      await msgDoc.save()

      return {
        success: false,
        messageId: msgDoc._id.toString(),
        error: errorMsg,
      }
    } catch (error: any) {
      msgDoc.status = 'failed'
      msgDoc.errorMessage = error.message
      await msgDoc.save()

      log.error('WhatsApp template send error:', error)
      return {
        success: false,
        messageId: msgDoc._id.toString(),
        error: error.message,
      }
    }
  }

  static async broadcastTemplate(params: {
    workspaceId: string
    accountId: string
    recipients: Array<{
      phone: string
      variables?: string[]
      contactId?: string
    }>
    templateName: string
    language?: string
  }): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const recipient of params.recipients) {
      const result = await this.sendTemplateMessage({
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        to: recipient.phone,
        templateName: params.templateName,
        language: params.language,
        variables: recipient.variables,
        contactId: recipient.contactId,
      })

      if (result.success) sent++
      else failed++

      // Rate limiting: 80 messages per second max for Meta API
      if ((sent + failed) % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { total: params.recipients.length, sent, failed }
  }

  static async handleWebhookStatus(payload: {
    waMessageId: string
    status: 'sent' | 'delivered' | 'read' | 'failed'
    timestamp: number
    errorCode?: string
    errorMessage?: string
  }) {
    const message = await WhatsAppMessage.findOne({
      waMessageId: payload.waMessageId,
    })
    if (!message) return

    message.status = payload.status
    if (payload.status === 'delivered') {
      message.deliveredAt = new Date(payload.timestamp * 1000)
    } else if (payload.status === 'read') {
      message.readByRecipientAt = new Date(payload.timestamp * 1000)
    } else if (payload.status === 'failed') {
      message.errorCode = payload.errorCode
      message.errorMessage = payload.errorMessage
    }

    await message.save()
  }

  static async handleIncomingMessage(params: {
    accountId: string
    from: string
    messageType: string
    content: string
    waMessageId: string
    mediaUrl?: string
    mediaId?: string
    timestamp: number
  }) {
    const account = await WhatsAppAccount.findOne({
      phoneNumberId: params.accountId,
      isActive: true,
    })

    if (!account) {
      log.warn('Received message for unknown account:', params.accountId)
      return null
    }

    const message = await WhatsAppMessage.create({
      workspaceId: account.workspaceId,
      accountId: account._id.toString(),
      direction: 'inbound',
      from: params.from,
      to: account.phoneNumber,
      messageType: params.messageType,
      content: params.content,
      waMessageId: params.waMessageId,
      mediaUrl: params.mediaUrl,
      mediaId: params.mediaId,
      status: 'delivered',
      isRead: false,
      sentAt: new Date(params.timestamp * 1000),
    })

    return message
  }

  static async getConversation(params: {
    workspaceId: string
    phone: string
    page?: number
    limit?: number
  }) {
    const page = params.page || 1
    const limit = params.limit || 50
    const skip = (page - 1) * limit

    const cleanPhone = this.formatPhone(params.phone)

    const [messages, total] = await Promise.all([
      WhatsAppMessage.find({
        workspaceId: params.workspaceId,
        $or: [{ from: cleanPhone }, { to: cleanPhone }],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WhatsAppMessage.countDocuments({
        workspaceId: params.workspaceId,
        $or: [{ from: cleanPhone }, { to: cleanPhone }],
      }),
    ])

    return {
      messages: messages.reverse().map((m: any) => ({ ...m, id: m._id })),
      total,
      hasMore: skip + messages.length < total,
    }
  }

  static formatPhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '')
    if (!cleaned.startsWith('+')) {
      cleaned = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
    } else {
      cleaned = cleaned.substring(1)
    }
    return cleaned
  }
}
