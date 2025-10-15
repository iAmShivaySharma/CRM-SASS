import mongoose, { Schema, Document } from 'mongoose'
import crypto from 'crypto'

export interface IEmailAccount extends Document {
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  provider: 'gmail' | 'outlook' | 'yahoo' | 'smtp' | 'imap' | 'custom'
  displayName: string
  emailAddress: string
  isActive: boolean
  isDefault: boolean

  // OAuth fields (for Gmail, Outlook, etc.)
  oauthAccessToken?: string
  oauthRefreshToken?: string
  oauthExpiresAt?: Date
  oauthScope?: string

  // SMTP/IMAP configuration
  smtpConfig?: {
    host: string
    port: number
    secure: boolean
    encryptedUsername: string
    encryptedPassword: string
  }

  imapConfig?: {
    host: string
    port: number
    secure: boolean
    encryptedUsername: string
    encryptedPassword: string
  }

  // Provider-specific settings
  settings: {
    signature?: string
    autoReply?: boolean
    autoReplyMessage?: string
    syncEnabled: boolean
    syncInterval: number // minutes
    lastSyncAt?: Date
    folders: {
      inbox: string
      sent: string
      drafts: string
      trash: string
      custom?: Array<{ name: string; path: string }>
    }
  }

  // Usage tracking
  stats: {
    emailsSent: number
    emailsReceived: number
    lastUsedAt?: Date
    quotaUsed?: number
    quotaLimit?: number
  }

  createdAt: Date
  updatedAt: Date

  // Methods
  encryptCredentials(data: string): string
  decryptCredentials(encrypted: string): string
  setSmtpCredentials(username: string, password: string): void
  setImapCredentials(username: string, password: string): void
  getSmtpCredentials(): { username: string; password: string } | null
  getImapCredentials(): { username: string; password: string } | null
  setOAuthTokens(accessToken: string, refreshToken: string, expiresIn: number): void
  getOAuthTokens(): { accessToken: string; refreshToken: string } | null
  isOAuthTokenExpired(): boolean
  recordEmailSent(): void
  recordEmailReceived(): void
}

const EmailAccountSchema = new Schema<IEmailAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    provider: {
      type: String,
      enum: ['gmail', 'outlook', 'yahoo', 'smtp', 'imap', 'custom'],
      required: true,
      index: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    emailAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },

    // OAuth fields
    oauthAccessToken: {
      type: String,
      select: false // Don't include in queries by default
    },
    oauthRefreshToken: {
      type: String,
      select: false
    },
    oauthExpiresAt: {
      type: Date
    },
    oauthScope: {
      type: String
    },

    // SMTP/IMAP configuration
    smtpConfig: {
      host: { type: String },
      port: { type: Number },
      secure: { type: Boolean, default: true },
      encryptedUsername: { type: String, select: false },
      encryptedPassword: { type: String, select: false }
    },

    imapConfig: {
      host: { type: String },
      port: { type: Number },
      secure: { type: Boolean, default: true },
      encryptedUsername: { type: String, select: false },
      encryptedPassword: { type: String, select: false }
    },

    // Settings
    settings: {
      signature: { type: String, default: '' },
      autoReply: { type: Boolean, default: false },
      autoReplyMessage: { type: String, default: '' },
      syncEnabled: { type: Boolean, default: true },
      syncInterval: { type: Number, default: 15, min: 5, max: 1440 }, // 5 min to 24 hours
      lastSyncAt: { type: Date },
      folders: {
        inbox: { type: String, default: 'INBOX' },
        sent: { type: String, default: 'INBOX.Sent' },
        drafts: { type: String, default: 'INBOX.Drafts' },
        trash: { type: String, default: 'INBOX.Trash' },
        custom: [{
          name: { type: String, required: true },
          path: { type: String, required: true }
        }]
      }
    },

    // Usage statistics
    stats: {
      emailsSent: { type: Number, default: 0, min: 0 },
      emailsReceived: { type: Number, default: 0, min: 0 },
      lastUsedAt: { type: Date },
      quotaUsed: { type: Number, default: 0, min: 0 },
      quotaLimit: { type: Number }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Compound indexes
EmailAccountSchema.index({ userId: 1, workspaceId: 1, isActive: 1 })
EmailAccountSchema.index({ userId: 1, workspaceId: 1, isDefault: 1 })
EmailAccountSchema.index({ provider: 1, isActive: 1 })
EmailAccountSchema.index({ emailAddress: 1, workspaceId: 1 }, { unique: true })

// Virtual for connection status
EmailAccountSchema.virtual('connectionStatus').get(function() {
  if (this.provider === 'gmail' || this.provider === 'outlook') {
    return this.isOAuthTokenExpired() ? 'expired' : 'connected'
  }

  if (this.provider === 'smtp' || this.provider === 'imap') {
    return (this.smtpConfig?.encryptedUsername || this.imapConfig?.encryptedUsername)
      ? 'connected' : 'not_configured'
  }

  return 'unknown'
})

// Virtual for masked email display
EmailAccountSchema.virtual('maskedEmail').get(function() {
  const [username, domain] = this.emailAddress.split('@')
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`
  }
  return `${username.substring(0, 2)}***${username.slice(-1)}@${domain}`
})

// Encryption/Decryption methods
EmailAccountSchema.methods.encryptCredentials = function(data: string): string {
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.EMAIL_ENCRYPTION_SECRET || process.env.API_KEY_ENCRYPTION_SECRET

  if (!secretKey || secretKey.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_SECRET must be a 64-character hex string')
  }

  const key = Buffer.from(secretKey, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

EmailAccountSchema.methods.decryptCredentials = function(encrypted: string): string {
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.EMAIL_ENCRYPTION_SECRET || process.env.API_KEY_ENCRYPTION_SECRET

  if (!secretKey || secretKey.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_SECRET must be a 64-character hex string')
  }

  const key = Buffer.from(secretKey, 'hex')
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':')

  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error('Invalid encrypted credential format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// SMTP/IMAP credential methods
EmailAccountSchema.methods.setSmtpCredentials = function(username: string, password: string) {
  if (!this.smtpConfig) this.smtpConfig = {}
  this.smtpConfig.encryptedUsername = this.encryptCredentials(username)
  this.smtpConfig.encryptedPassword = this.encryptCredentials(password)
}

EmailAccountSchema.methods.setImapCredentials = function(username: string, password: string) {
  if (!this.imapConfig) this.imapConfig = {}
  this.imapConfig.encryptedUsername = this.encryptCredentials(username)
  this.imapConfig.encryptedPassword = this.encryptCredentials(password)
}

EmailAccountSchema.methods.getSmtpCredentials = function() {
  if (!this.smtpConfig?.encryptedUsername || !this.smtpConfig?.encryptedPassword) {
    return null
  }

  try {
    return {
      username: this.decryptCredentials(this.smtpConfig.encryptedUsername),
      password: this.decryptCredentials(this.smtpConfig.encryptedPassword)
    }
  } catch (error) {
    console.error('Failed to decrypt SMTP credentials:', error)
    return null
  }
}

EmailAccountSchema.methods.getImapCredentials = function() {
  if (!this.imapConfig?.encryptedUsername || !this.imapConfig?.encryptedPassword) {
    return null
  }

  try {
    return {
      username: this.decryptCredentials(this.imapConfig.encryptedUsername),
      password: this.decryptCredentials(this.imapConfig.encryptedPassword)
    }
  } catch (error) {
    console.error('Failed to decrypt IMAP credentials:', error)
    return null
  }
}

// OAuth token methods
EmailAccountSchema.methods.setOAuthTokens = function(accessToken: string, refreshToken: string, expiresIn: number) {
  this.oauthAccessToken = this.encryptCredentials(accessToken)
  this.oauthRefreshToken = this.encryptCredentials(refreshToken)
  this.oauthExpiresAt = new Date(Date.now() + (expiresIn * 1000))
}

EmailAccountSchema.methods.getOAuthTokens = function() {
  if (!this.oauthAccessToken || !this.oauthRefreshToken) {
    return null
  }

  try {
    return {
      accessToken: this.decryptCredentials(this.oauthAccessToken),
      refreshToken: this.decryptCredentials(this.oauthRefreshToken)
    }
  } catch (error) {
    console.error('Failed to decrypt OAuth tokens:', error)
    return null
  }
}

EmailAccountSchema.methods.isOAuthTokenExpired = function(): boolean {
  if (!this.oauthExpiresAt) return true
  return new Date() >= this.oauthExpiresAt
}

// Usage tracking methods
EmailAccountSchema.methods.recordEmailSent = function() {
  this.stats.emailsSent += 1
  this.stats.lastUsedAt = new Date()
  return this.save()
}

EmailAccountSchema.methods.recordEmailReceived = function() {
  this.stats.emailsReceived += 1
  this.settings.lastSyncAt = new Date()
  return this.save()
}

// Static methods
EmailAccountSchema.statics.findByUser = function(userId: string, workspaceId: string) {
  return this.find({
    userId,
    workspaceId,
    isActive: true
  }).sort({ isDefault: -1, createdAt: -1 })
}

EmailAccountSchema.statics.findDefaultAccount = function(userId: string, workspaceId: string) {
  return this.findOne({
    userId,
    workspaceId,
    isActive: true,
    isDefault: true
  })
}

EmailAccountSchema.statics.setAsDefault = async function(accountId: string, userId: string, workspaceId: string) {
  // Remove default flag from all other accounts
  await this.updateMany(
    { userId, workspaceId, _id: { $ne: accountId } },
    { isDefault: false }
  )

  // Set the specified account as default
  return this.findByIdAndUpdate(
    accountId,
    { isDefault: true },
    { new: true }
  )
}

EmailAccountSchema.statics.findExpiredOAuthAccounts = function() {
  return this.find({
    isActive: true,
    provider: { $in: ['gmail', 'outlook'] },
    oauthExpiresAt: { $lte: new Date() }
  })
}

// Pre-save middleware to ensure only one default account per user/workspace
EmailAccountSchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    await (this.constructor as any).updateMany(
      {
        userId: this.userId,
        workspaceId: this.workspaceId,
        _id: { $ne: this._id }
      },
      { isDefault: false }
    )
  }

  next()
})

export default mongoose.models.EmailAccount ||
  mongoose.model<IEmailAccount>('EmailAccount', EmailAccountSchema)