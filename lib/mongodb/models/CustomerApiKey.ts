import mongoose, { Schema, Document } from 'mongoose'
import crypto from 'crypto'

export interface ICustomerApiKey extends Document {
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  provider: 'openrouter'
  keyName: string
  encryptedApiKey: string
  isActive: boolean
  isDefault: boolean
  lastUsedAt?: Date
  totalUsage: {
    executions: number
    tokensUsed: number
    lastResetAt: Date
  }
  createdAt: Date
  updatedAt: Date

  // Methods
  encryptApiKey(apiKey: string): string
  decryptApiKey(): string
  setApiKey(apiKey: string): void
  getPlainApiKey(): string
}

const CustomerApiKeySchema = new Schema<ICustomerApiKey>(
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
      enum: ['openrouter'],
      default: 'openrouter',
      required: true,
      index: true
    },
    keyName: {
      type: String,
      required: true,
      trim: true
    },
    encryptedApiKey: {
      type: String,
      required: true
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
    lastUsedAt: {
      type: Date
    },
    totalUsage: {
      executions: {
        type: Number,
        default: 0,
        min: 0
      },
      tokensUsed: {
        type: Number,
        default: 0,
        min: 0
      },
      lastResetAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Compound indexes
CustomerApiKeySchema.index({ userId: 1, workspaceId: 1, isActive: 1 })
CustomerApiKeySchema.index({ userId: 1, workspaceId: 1, isDefault: 1 })
CustomerApiKeySchema.index({ provider: 1, isActive: 1 })

// Virtual for API key preview (showing only first and last few characters)
CustomerApiKeySchema.virtual('keyPreview').get(function() {
  if (!this.encryptedApiKey) return 'sk-***-***'

  try {
    const decrypted = this.decryptApiKey()
    if (decrypted.length < 10) return 'sk-***-***'

    const start = decrypted.substring(0, 8)
    const end = decrypted.substring(decrypted.length - 3)
    return `${start}...${end}`
  } catch (error) {
    return 'sk-***-***'
  }
})

// Methods for encryption/decryption
CustomerApiKeySchema.methods.encryptApiKey = function(apiKey: string): string {
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.API_KEY_ENCRYPTION_SECRET

  if (!secretKey || secretKey.length !== 64) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be a 64-character hex string')
  }

  const key = Buffer.from(secretKey, 'hex') as any
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv as any)

  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

CustomerApiKeySchema.methods.decryptApiKey = function(): string {
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.API_KEY_ENCRYPTION_SECRET

  if (!secretKey || secretKey.length !== 64) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be a 64-character hex string')
  }

  const key = Buffer.from(secretKey, 'hex') as any
  const [ivHex, authTagHex, encrypted] = this.encryptedApiKey.split(':')

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted API key format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv as any)

  decipher.setAuthTag(authTag as any)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

CustomerApiKeySchema.methods.setApiKey = function(apiKey: string) {
  this.encryptedApiKey = this.encryptApiKey(apiKey)
  return this
}

CustomerApiKeySchema.methods.validateApiKey = async function(): Promise<boolean> {
  try {
    const apiKey = this.decryptApiKey()

    // Basic format validation for OpenRouter keys
    if (this.provider === 'openrouter') {
      return apiKey.startsWith('sk-or-v1-') && apiKey.length > 20
    }

    return false
  } catch (error) {
    console.error('API key validation error:', error)
    return false
  }
}

CustomerApiKeySchema.methods.recordUsage = function(tokensUsed: number = 0) {
  this.totalUsage.executions += 1
  this.totalUsage.tokensUsed += tokensUsed
  this.lastUsedAt = new Date()
  return this.save()
}

CustomerApiKeySchema.methods.resetUsageStats = function() {
  this.totalUsage.executions = 0
  this.totalUsage.tokensUsed = 0
  this.totalUsage.lastResetAt = new Date()
  return this.save()
}

// Static methods
CustomerApiKeySchema.statics.findByUser = function(userId: string, workspaceId: string) {
  return this.find({
    userId,
    workspaceId,
    isActive: true
  }).sort({ isDefault: -1, createdAt: -1 })
}

CustomerApiKeySchema.statics.findDefaultKey = function(userId: string, workspaceId: string) {
  return this.findOne({
    userId,
    workspaceId,
    isActive: true,
    isDefault: true
  })
}

CustomerApiKeySchema.statics.setAsDefault = async function(keyId: string, userId: string, workspaceId: string) {
  // Remove default flag from all other keys
  await this.updateMany(
    { userId, workspaceId, _id: { $ne: keyId } },
    { isDefault: false }
  )

  // Set the specified key as default
  return this.findByIdAndUpdate(
    keyId,
    { isDefault: true },
    { new: true }
  )
}

CustomerApiKeySchema.statics.getUsageStatsByUser = function(userId: string, workspaceId: string) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalKeys: { $sum: 1 },
        totalExecutions: { $sum: '$totalUsage.executions' },
        totalTokens: { $sum: '$totalUsage.tokensUsed' },
        lastUsed: { $max: '$lastUsedAt' }
      }
    }
  ])
}

// Pre-save middleware to ensure only one default key per user/workspace
CustomerApiKeySchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    // Remove default flag from other keys
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

export default mongoose.models.CustomerApiKey ||
  mongoose.model<ICustomerApiKey>('CustomerApiKey', CustomerApiKeySchema)