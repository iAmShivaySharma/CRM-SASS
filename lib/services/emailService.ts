import { Resend } from 'resend'
import { log } from '@/lib/logging/logger'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export interface InvitationEmailData {
  email: string
  workspaceName: string
  roleName: string
  inviterName: string
  inviteToken: string
  acceptUrl: string
  message?: string
}

class EmailService {
  private resend: Resend | null = null
  private isConfigured = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      log.warn('RESEND_API_KEY not found in environment variables. Email service will be disabled.')
      return
    }

    try {
      this.resend = new Resend(apiKey)
      this.isConfigured = true
      log.info('Email service initialized successfully with Resend')
    } catch (error) {
      log.error('Failed to initialize email service:', error)
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.resend) {
      log.warn('Email service not configured. Skipping email send.')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const result = await this.resend.emails.send({
        from: options.from || process.env.EMAIL_FROM_ADDRESS || 'CRM <noreply@yourdomain.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      if (result.error) {
        log.error('Failed to send email:', result.error)
        return { success: false, error: result.error.message }
      }

      log.info(`Email sent successfully to ${options.to}`, {
        messageId: result.data?.id,
        subject: options.subject
      })

      return { success: true, messageId: result.data?.id }
    } catch (error) {
      log.error('Email service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      log.warn('Email service not configured. Skipping invitation email.')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      // Import email template
      const { getInvitationEmailTemplate } = await import('@/lib/templates/email/invitationTemplate')

      const { html, text, subject } = getInvitationEmailTemplate(data)

      return await this.sendEmail({
        to: data.email,
        subject,
        html,
        text,
      })
    } catch (error) {
      log.error('Failed to send invitation email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation email'
      }
    }
  }

  isReady(): boolean {
    return this.isConfigured && this.resend !== null
  }
}

// Export singleton instance
export const emailService = new EmailService()
export default emailService