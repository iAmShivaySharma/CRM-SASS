import nodemailer from 'nodemailer'
import { google } from 'googleapis'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'
import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { GoogleOAuthProvider, MicrosoftOAuthProvider } from '@/lib/auth/oauth-providers'
import { EmailAccount, EmailMessage } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export interface EmailSendOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
    encoding?: string
  }>
  replyTo?: string
  inReplyTo?: string
  references?: string[]
}

export interface EmailSyncOptions {
  folder?: string
  since?: Date
  limit?: number
  markAsRead?: boolean
}

// Base Email Provider Interface
export abstract class BaseEmailProvider {
  protected account: any

  constructor(account: any) {
    this.account = account
  }

  abstract sendEmail(options: EmailSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }>
  abstract syncEmails(options?: EmailSyncOptions): Promise<{ success: boolean; count: number; error?: string }>
  abstract testConnection(): Promise<{ success: boolean; error?: string }>
  abstract getFolders(): Promise<{ success: boolean; folders?: any[]; error?: string }>
}

// Gmail Provider
export class GmailProvider extends BaseEmailProvider {
  private gmail: any
  private oauth2Client: any

  constructor(account: any) {
    super(account)
    this.initializeClient()
  }

  private initializeClient() {
    try {
      const tokens = this.account.getOAuthTokens()
      if (!tokens) {
        throw new Error('No OAuth tokens available')
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI
      )

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      })

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    } catch (error) {
      log.error('Failed to initialize Gmail client:', error)
      throw error
    }
  }

  async sendEmail(options: EmailSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = this.createMimeMessage(options)

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(message).toString('base64url')
        }
      })

      await this.account.recordEmailSent()

      return {
        success: true,
        messageId: response.data.id
      }
    } catch (error) {
      log.error('Gmail send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      }
    }
  }

  async syncEmails(options?: EmailSyncOptions): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const query = this.buildGmailQuery(options)

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: options?.limit || 50
      })

      if (!response.data.messages) {
        return { success: true, count: 0 }
      }

      let syncedCount = 0

      for (const message of response.data.messages) {
        try {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          })

          const emailMessage = await this.parseGmailMessage(fullMessage.data)

          // Check if message already exists
          const existing = await EmailMessage.findOne({
            messageId: emailMessage.messageId,
            emailAccountId: this.account._id
          })

          if (!existing) {
            await emailMessage.save()
            syncedCount++
          }
        } catch (parseError) {
          log.warn('Failed to parse Gmail message:', parseError)
        }
      }

      this.account.settings.lastSyncAt = new Date()
      await this.account.save()

      return { success: true, count: syncedCount }
    } catch (error) {
      log.error('Gmail sync error:', error)
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to sync emails'
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  async getFolders(): Promise<{ success: boolean; folders?: any[]; error?: string }> {
    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' })

      const folders = response.data.labels?.map((label: any) => ({
        id: label.id,
        name: label.name,
        type: label.type,
        messagesTotal: label.messagesTotal,
        messagesUnread: label.messagesUnread
      })) || []

      return { success: true, folders }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get folders'
      }
    }
  }

  private createMimeMessage(options: EmailSendOptions): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const headers = [
      `From: ${this.account.emailAddress}`,
      `To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
      ...(options.cc ? [`Cc: ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}`] : []),
      ...(options.bcc ? [`Bcc: ${Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc}`] : []),
      `Subject: ${options.subject}`,
      ...(options.replyTo ? [`Reply-To: ${options.replyTo}`] : []),
      ...(options.inReplyTo ? [`In-Reply-To: ${options.inReplyTo}`] : []),
      ...(options.references ? [`References: ${options.references.join(' ')}`] : []),
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`
    ]

    let body = headers.join('\r\n') + '\r\n\r\n'

    // Add text/html content
    if (options.text || options.html) {
      body += `--${boundary}\r\n`
      if (options.html) {
        body += `Content-Type: text/html; charset=UTF-8\r\n\r\n${options.html}\r\n`
      } else {
        body += `Content-Type: text/plain; charset=UTF-8\r\n\r\n${options.text}\r\n`
      }
    }

    // Add attachments
    if (options.attachments) {
      for (const attachment of options.attachments) {
        body += `--${boundary}\r\n`
        body += `Content-Type: ${attachment.contentType || 'application/octet-stream'}\r\n`
        body += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
        body += `Content-Transfer-Encoding: base64\r\n\r\n`

        const content = Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(attachment.content)
        body += content.toString('base64') + '\r\n'
      }
    }

    body += `--${boundary}--\r\n`
    return body
  }

  private buildGmailQuery(options?: EmailSyncOptions): string {
    const parts = []

    if (options?.since) {
      const date = Math.floor(options.since.getTime() / 1000)
      parts.push(`after:${date}`)
    }

    if (options?.folder && options.folder !== 'INBOX') {
      parts.push(`label:${options.folder}`)
    }

    return parts.join(' ')
  }

  private async parseGmailMessage(gmailMessage: any): Promise<any> {
    const headers = gmailMessage.payload.headers
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value

    const emailMessage = new EmailMessage({
      userId: this.account.userId,
      workspaceId: this.account.workspaceId,
      emailAccountId: this.account._id,
      messageId: gmailMessage.id,
      threadId: gmailMessage.threadId,

      from: {
        email: getHeader('From') || '',
        name: this.extractEmailName(getHeader('From') || '')
      },

      to: this.parseEmailAddresses(getHeader('To') || ''),
      cc: this.parseEmailAddresses(getHeader('Cc') || ''),
      bcc: this.parseEmailAddresses(getHeader('Bcc') || ''),

      subject: getHeader('Subject') || '',

      direction: 'inbound',
      status: 'delivered',

      sentAt: new Date(parseInt(gmailMessage.internalDate)),
      receivedAt: new Date(parseInt(gmailMessage.internalDate)),

      folder: 'INBOX',
      labels: gmailMessage.labelIds || [],

      isRead: !gmailMessage.labelIds?.includes('UNREAD'),
      isStarred: gmailMessage.labelIds?.includes('STARRED'),
      isImportant: gmailMessage.labelIds?.includes('IMPORTANT'),

      providerData: {
        rawHeaders: headers,
        internalDate: new Date(parseInt(gmailMessage.internalDate)),
        size: gmailMessage.sizeEstimate,
        flags: gmailMessage.labelIds
      }
    })

    // Extract body content
    const { text, html } = this.extractGmailBody(gmailMessage.payload)
    emailMessage.bodyText = text
    emailMessage.bodyHtml = html

    return emailMessage
  }

  private extractGmailBody(payload: any): { text?: string; html?: string } {
    let text = ''
    let html = ''

    if (payload.body?.data) {
      const content = Buffer.from(payload.body.data, 'base64').toString()
      if (payload.mimeType === 'text/plain') {
        text = content
      } else if (payload.mimeType === 'text/html') {
        html = content
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const extracted = this.extractGmailBody(part)
        if (extracted.text) text = extracted.text
        if (extracted.html) html = extracted.html
      }
    }

    return { text, html }
  }

  private parseEmailAddresses(addressString: string): Array<{ name?: string; email: string }> {
    if (!addressString) return []

    return addressString.split(',').map(addr => {
      const match = addr.trim().match(/^(.+?)\s*<(.+?)>$/)
      if (match) {
        return { name: match[1].trim(), email: match[2].trim() }
      }
      return { email: addr.trim() }
    })
  }

  private extractEmailName(fromString: string): string {
    const match = fromString.match(/^(.+?)\s*<.+?>$/)
    return match ? match[1].trim() : ''
  }
}

// SMTP Provider for general email sending
export class SMTPProvider extends BaseEmailProvider {
  private transporter: any

  constructor(account: any) {
    super(account)
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const credentials = this.account.getSmtpCredentials()
    if (!credentials) {
      throw new Error('No SMTP credentials available')
    }

    this.transporter = nodemailer.createTransporter({
      host: this.account.smtpConfig.host,
      port: this.account.smtpConfig.port,
      secure: this.account.smtpConfig.secure,
      auth: {
        user: credentials.username,
        pass: credentials.password
      }
    })
  }

  async sendEmail(options: EmailSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: this.account.emailAddress,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
        inReplyTo: options.inReplyTo,
        references: options.references
      }

      const info = await this.transporter.sendMail(mailOptions)
      await this.account.recordEmailSent()

      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      log.error('SMTP send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      }
    }
  }

  async syncEmails(): Promise<{ success: boolean; count: number; error?: string }> {
    // SMTP is send-only, no sync capability
    return { success: true, count: 0 }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  async getFolders(): Promise<{ success: boolean; folders?: any[]; error?: string }> {
    // SMTP doesn't have folders
    return { success: true, folders: [] }
  }
}

// Email Provider Factory
export class EmailProviderFactory {
  static async createProvider(account: any): Promise<BaseEmailProvider> {
    switch (account.provider) {
      case 'gmail':
        return new GmailProvider(account)
      case 'smtp':
        return new SMTPProvider(account)
      case 'outlook':
        // TODO: Implement OutlookProvider
        throw new Error('Outlook provider not yet implemented')
      default:
        throw new Error(`Unsupported email provider: ${account.provider}`)
    }
  }
}

// Email Service Manager
export class EmailService {
  static async sendEmail(accountId: string, options: EmailSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const account = await EmailAccount.findById(accountId)
      if (!account || !account.isActive) {
        return { success: false, error: 'Email account not found or inactive' }
      }

      const provider = await EmailProviderFactory.createProvider(account)
      const result = await provider.sendEmail(options)

      // Log the email send activity
      if (result.success) {
        // TODO: Create activity log
        log.info(`Email sent successfully from ${account.emailAddress}`, {
          accountId,
          messageId: result.messageId,
          subject: options.subject
        })
      }

      return result
    } catch (error) {
      log.error('Email service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email service error'
      }
    }
  }

  static async syncAccountEmails(accountId: string, options?: EmailSyncOptions): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const account = await EmailAccount.findById(accountId)
      if (!account || !account.isActive || !account.settings.syncEnabled) {
        return { success: false, count: 0, error: 'Account not found or sync disabled' }
      }

      const provider = await EmailProviderFactory.createProvider(account)
      const result = await provider.syncEmails(options)

      if (result.success) {
        await account.recordEmailReceived()
        log.info(`Synced ${result.count} emails for account ${account.emailAddress}`)
      }

      return result
    } catch (error) {
      log.error('Email sync error:', error)
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Email sync error'
      }
    }
  }

  static async testAccountConnection(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const account = await EmailAccount.findById(accountId)
      if (!account) {
        return { success: false, error: 'Account not found' }
      }

      const provider = await EmailProviderFactory.createProvider(account)
      return await provider.testConnection()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}