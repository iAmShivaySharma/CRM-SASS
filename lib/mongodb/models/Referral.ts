import mongoose, { Schema } from 'mongoose'
import crypto from 'crypto'

export interface IReferral {
  referrerId: string
  referrerWorkspaceId: string
  referralCode: string
  referredUserId?: string
  referredEmail?: string
  status: 'pending' | 'signed_up' | 'converted' | 'rewarded'
  rewardType?: string
  rewardApplied: boolean
  createdAt: Date
  convertedAt?: Date
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: String, ref: 'User', required: true },
    referrerWorkspaceId: { type: String, ref: 'Workspace', required: true },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(6).toString('hex'),
    },
    referredUserId: { type: String, ref: 'User' },
    referredEmail: { type: String },
    status: {
      type: String,
      enum: ['pending', 'signed_up', 'converted', 'rewarded'],
      default: 'pending',
    },
    rewardType: { type: String },
    rewardApplied: { type: Boolean, default: false },
    convertedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

if (typeof window === 'undefined') {
  ReferralSchema.index({ referrerId: 1 })
  ReferralSchema.index({ referralCode: 1 }, { unique: true })
  ReferralSchema.index({ referredEmail: 1 })
}

export const Referral =
  mongoose.models?.Referral ||
  mongoose.model<IReferral>('Referral', ReferralSchema)
