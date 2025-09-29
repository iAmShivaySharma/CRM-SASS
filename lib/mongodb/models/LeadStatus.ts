import mongoose, { Document, Schema } from 'mongoose'

export interface ILeadStatus extends Document {
  _id: string
  workspaceId: string
  name: string
  color: string
  description?: string
  order: number
  isDefault: boolean
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const LeadStatusSchema = new Schema<ILeadStatus>(
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
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
      default: '#3b82f6',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
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

// Optimized indexes for performance
if (typeof window === 'undefined') {
  LeadStatusSchema.index({ workspaceId: 1, name: 1 }, { unique: true })
  LeadStatusSchema.index({ workspaceId: 1, order: 1 })
}

export const LeadStatus =
  mongoose.models?.LeadStatus ||
  mongoose.model<ILeadStatus>('LeadStatus', LeadStatusSchema)
