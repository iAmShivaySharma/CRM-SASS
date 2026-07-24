import mongoose, { Document, Schema } from 'mongoose'
import crypto from 'crypto'

export interface ILicenseKey extends Omit<Document, '_id'> {
  _id: string
  key: string
  planId: string
  status: 'active' | 'used' | 'expired' | 'revoked'
  maxActivations: number
  currentActivations: number
  activatedBy: {
    userId: string
    workspaceId: string
    activatedAt: Date
  } | null
  validFrom: Date
  validUntil: Date | null
  metadata: {
    note?: string
    createdFor?: string
    batchId?: string
  }
  generatedBy: string
  revokedAt?: Date
  revokedBy?: string
  createdAt: Date
  updatedAt: Date

  // Instance methods
  activate(userId: string, workspaceId: string): Promise<ILicenseKey>
  revoke(revokedByUserId: string): Promise<ILicenseKey>
}

export interface ILicenseKeyModel extends mongoose.Model<ILicenseKey> {
  generateKey(): string
}

const LicenseKeySchema = new Schema<ILicenseKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      ref: 'Plan',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'revoked'],
      default: 'active',
    },
    maxActivations: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentActivations: {
      type: Number,
      default: 0,
      min: 0,
    },
    activatedBy: {
      userId: {
        type: String,
        ref: 'User',
      },
      workspaceId: {
        type: String,
        ref: 'Workspace',
      },
      activatedAt: {
        type: Date,
      },
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    metadata: {
      note: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      createdFor: {
        type: String,
        trim: true,
        maxlength: 255,
      },
      batchId: {
        type: String,
        trim: true,
      },
    },
    generatedBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: String,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Indexes
if (typeof window === 'undefined') {
  LicenseKeySchema.index({ key: 1 }, { unique: true })
  LicenseKeySchema.index({ status: 1 })
  LicenseKeySchema.index({ planId: 1, status: 1 })
  LicenseKeySchema.index({ generatedBy: 1 })
  LicenseKeySchema.index({ 'activatedBy.workspaceId': 1 }, { sparse: true })
  LicenseKeySchema.index({ 'metadata.batchId': 1 }, { sparse: true })
}

// Static method: generate a cryptographically secure license key
LicenseKeySchema.statics.generateKey = function (): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.randomBytes(16)
  const segments: string[] = []

  for (let seg = 0; seg < 4; seg++) {
    let segment = ''
    for (let i = 0; i < 4; i++) {
      const idx = bytes[seg * 4 + i] % chars.length
      segment += chars[idx]
    }
    segments.push(segment)
  }

  return `CRM-${segments.join('-')}`
}

// Instance method: activate a license key for a user/workspace
LicenseKeySchema.methods.activate = async function (
  userId: string,
  workspaceId: string
): Promise<ILicenseKey> {
  if (this.status !== 'active') {
    throw new Error(
      `License key is not active (current status: ${this.status})`
    )
  }

  if (this.currentActivations >= this.maxActivations) {
    throw new Error('License key has reached maximum activations')
  }

  if (this.validUntil && new Date(this.validUntil) < new Date()) {
    this.status = 'expired'
    await this.save()
    throw new Error('License key has expired')
  }

  this.activatedBy = {
    userId,
    workspaceId,
    activatedAt: new Date(),
  }
  this.currentActivations += 1
  this.status = 'used'

  return await this.save()
}

// Instance method: revoke a license key
LicenseKeySchema.methods.revoke = async function (
  revokedByUserId: string
): Promise<ILicenseKey> {
  this.status = 'revoked'
  this.revokedAt = new Date()
  this.revokedBy = revokedByUserId

  return await this.save()
}

export const LicenseKey =
  (mongoose.models?.LicenseKey as unknown as ILicenseKeyModel) ||
  mongoose.model<ILicenseKey, ILicenseKeyModel>('LicenseKey', LicenseKeySchema)
