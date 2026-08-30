import { SmsLog } from '@/lib/mongodb/models/SmsLog'
import { SmsTemplate } from '@/lib/mongodb/models/SmsTemplate'
import { log } from '@/lib/logging/logger'

export interface SmsProvider {
  name: string
  sendSms(
    to: string,
    message: string,
    options?: any
  ): Promise<{
    messageId?: string
    status: 'sent' | 'failed'
    error?: string
  }>
}

// MSG91 provider
class Msg91Provider implements SmsProvider {
  name = 'msg91'

  async sendSms(to: string, message: string, options?: any) {
    const authKey = process.env.MSG91_AUTH_KEY
    const senderId = options?.senderId || process.env.MSG91_SENDER_ID

    if (!authKey) {
      return {
        status: 'failed' as const,
        error: 'MSG91_AUTH_KEY not configured',
      }
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({
          sender: senderId,
          route: options?.type === 'promotional' ? '1' : '4',
          country: '91',
          sms: [{ message, to: [to.replace(/^\+91/, '')] }],
        }),
      })

      const data = await response.json()

      if (data.type === 'success') {
        return { messageId: data.request_id, status: 'sent' as const }
      }
      return {
        status: 'failed' as const,
        error: data.message || 'Unknown error',
      }
    } catch (error: any) {
      return { status: 'failed' as const, error: error.message }
    }
  }
}

// Textlocal provider
class TextlocalProvider implements SmsProvider {
  name = 'textlocal'

  async sendSms(to: string, message: string, options?: any) {
    const apiKey = process.env.TEXTLOCAL_API_KEY
    const sender = options?.senderId || process.env.TEXTLOCAL_SENDER

    if (!apiKey) {
      return {
        status: 'failed' as const,
        error: 'TEXTLOCAL_API_KEY not configured',
      }
    }

    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        numbers: to.replace(/^\+/, ''),
        message,
        sender: sender || 'TXTLCL',
      })

      const response = await fetch(
        `https://api.textlocal.in/send/?${params.toString()}`
      )
      const data = await response.json()

      if (data.status === 'success') {
        return {
          messageId: data.messages?.[0]?.id,
          status: 'sent' as const,
        }
      }
      return {
        status: 'failed' as const,
        error: data.errors?.[0]?.message || 'Unknown error',
      }
    } catch (error: any) {
      return { status: 'failed' as const, error: error.message }
    }
  }
}

function getProvider(): SmsProvider {
  const providerName = process.env.SMS_PROVIDER || 'msg91'
  switch (providerName) {
    case 'textlocal':
      return new TextlocalProvider()
    case 'msg91':
    default:
      return new Msg91Provider()
  }
}

export class SmsService {
  static async sendSms(params: {
    workspaceId: string
    to: string
    message: string
    type?: 'transactional' | 'promotional' | 'otp'
    templateId?: string
    variables?: Record<string, string>
    entityType?: string
    entityId?: string
    senderId?: string
    sentBy: string
  }): Promise<{ success: boolean; logId: string; error?: string }> {
    const provider = getProvider()

    // Replace variables in message
    let finalMessage = params.message
    if (params.variables) {
      Object.entries(params.variables).forEach(([key, value]) => {
        finalMessage = finalMessage.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          value
        )
      })
    }

    // Clean phone number
    let phone = params.to.replace(/\s+/g, '')
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('91') ? `+${phone}` : `+91${phone}`
    }

    const smsLog = await SmsLog.create({
      workspaceId: params.workspaceId,
      templateId: params.templateId,
      to: phone,
      message: finalMessage,
      type: params.type || 'transactional',
      status: 'pending',
      provider: provider.name,
      variables: params.variables,
      entityType: params.entityType,
      entityId: params.entityId,
      sentBy: params.sentBy,
      sentAt: new Date(),
    })

    try {
      const result = await provider.sendSms(phone, finalMessage, {
        senderId: params.senderId,
        type: params.type,
      })

      smsLog.status = result.status
      smsLog.providerMessageId = result.messageId
      if (result.error) smsLog.errorMessage = result.error
      await smsLog.save()

      // Update template usage count
      if (params.templateId) {
        await SmsTemplate.findByIdAndUpdate(params.templateId, {
          $inc: { usageCount: 1 },
        })
      }

      if (result.status === 'failed') {
        log.error('SMS send failed:', {
          to: phone,
          error: result.error,
          provider: provider.name,
        })
        return {
          success: false,
          logId: smsLog._id.toString(),
          error: result.error,
        }
      }

      return { success: true, logId: smsLog._id.toString() }
    } catch (error: any) {
      smsLog.status = 'failed'
      smsLog.errorMessage = error.message
      await smsLog.save()

      log.error('SMS service error:', error)
      return {
        success: false,
        logId: smsLog._id.toString(),
        error: error.message,
      }
    }
  }

  static async sendBulk(params: {
    workspaceId: string
    recipients: Array<{ phone: string; variables?: Record<string, string> }>
    message: string
    type?: 'transactional' | 'promotional'
    templateId?: string
    sentBy: string
  }): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const recipient of params.recipients) {
      const result = await SmsService.sendSms({
        workspaceId: params.workspaceId,
        to: recipient.phone,
        message: params.message,
        type: params.type,
        templateId: params.templateId,
        variables: recipient.variables,
        sentBy: params.sentBy,
      })

      if (result.success) sent++
      else failed++
    }

    return { total: params.recipients.length, sent, failed }
  }
}
