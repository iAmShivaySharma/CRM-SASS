import mongoose, { Document, Schema } from 'mongoose'

export interface IService extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  name: string
  description?: string
  duration: number
  bufferTime: number
  price: number
  currency: string
  category?: string
  color: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const ServiceSchema = new Schema<IService>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    duration: {
      type: Number,
      required: true,
      min: 5,
      max: 480,
      default: 30,
    },
    bufferTime: {
      type: Number,
      default: 0,
      min: 0,
      max: 120,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      maxlength: 5,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      default: '#6366f1',
      match: /^#[0-9A-Fa-f]{6}$/,
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
  ServiceSchema.index({ workspaceId: 1, isActive: 1 })
  ServiceSchema.index({ workspaceId: 1, name: 1 }, { unique: true })
  ServiceSchema.index({ workspaceId: 1, category: 1 })
}

export const Service =
  mongoose.models?.Service || mongoose.model<IService>('Service', ServiceSchema)
