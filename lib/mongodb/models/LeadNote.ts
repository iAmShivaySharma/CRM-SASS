import mongoose, { Document, Schema } from 'mongoose'

export interface ILeadNote extends Document {
  _id: string
  leadId: string
  workspaceId: string
  content: string
  type: 'note' | 'call' | 'email' | 'meeting' | 'task'
  isPrivate: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const LeadNoteSchema = new Schema<ILeadNote>(
  {
    leadId: {
      type: String,
      ref: 'Lead',
      required: true,
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['note', 'call', 'email', 'meeting', 'task'],
      default: 'note',
    },
    isPrivate: {
      type: Boolean,
      default: false,
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
  LeadNoteSchema.index({ leadId: 1, createdAt: -1 })
  LeadNoteSchema.index({ workspaceId: 1, type: 1 })
}

export const LeadNote =
  mongoose.models?.LeadNote ||
  mongoose.model<ILeadNote>('LeadNote', LeadNoteSchema)
