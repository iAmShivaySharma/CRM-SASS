import mongoose, { Schema } from 'mongoose'

export interface IPushSubscription {
  userId: string
  workspaceId: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  createdAt: Date
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, ref: 'User', required: true },
    workspaceId: { type: String, ref: 'Workspace', required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
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
  PushSubscriptionSchema.index({ userId: 1, workspaceId: 1 })
  PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true })
}

export const PushSubscription =
  mongoose.models?.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)
