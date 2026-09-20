import mongoose, { Document, Schema } from 'mongoose'

export interface ICallSettings extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  provider: 'telecmi' | 'exotel' | 'custom'
  apiKey: string
  apiSecret: string
  callerId: string
  webhookUrl?: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const CallSettingsSchema = new Schema<ICallSettings>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: ['telecmi', 'exotel', 'custom'],
      default: 'telecmi',
    },
    apiKey: {
      type: String,
      required: true,
      trim: true,
    },
    apiSecret: {
      type: String,
      required: true,
      trim: true,
    },
    callerId: {
      type: String,
      required: true,
      trim: true,
    },
    webhookUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
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
  CallSettingsSchema.index({ workspaceId: 1 }, { unique: true })
}

export const CallSettings =
  mongoose.models?.CallSettings ||
  mongoose.model<ICallSettings>('CallSettings', CallSettingsSchema)
