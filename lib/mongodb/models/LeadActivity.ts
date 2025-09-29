import mongoose, { Document, Schema } from 'mongoose'

export interface ILeadActivity extends Document {
  _id: string
  leadId: string
  workspaceId: string
  activityType:
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'assigned'
    | 'note_added'
    | 'converted'
    | 'deleted'
  performedBy: string
  description: string
  changes?: {
    field: string
    oldValue?: any
    newValue?: any
  }[]
  metadata?: Record<string, any>
  createdAt: Date
}

const LeadActivitySchema = new Schema<ILeadActivity>(
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
    activityType: {
      type: String,
      enum: [
        'created',
        'updated',
        'status_changed',
        'assigned',
        'note_added',
        'converted',
        'deleted',
      ],
      required: true,
    },
    performedBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        oldValue: {
          type: Schema.Types.Mixed,
          required: false,
        },
        newValue: {
          type: Schema.Types.Mixed,
          required: false,
        },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
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

// Optimized indexes for performance
if (typeof window === 'undefined') {
  LeadActivitySchema.index({ leadId: 1, createdAt: -1 })
  LeadActivitySchema.index({ workspaceId: 1, activityType: 1 })
  LeadActivitySchema.index({ performedBy: 1, createdAt: -1 })
  // TTL index to automatically delete activities older than 2 years
  LeadActivitySchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 }
  )
}

export const LeadActivity =
  mongoose.models?.LeadActivity ||
  mongoose.model<ILeadActivity>('LeadActivity', LeadActivitySchema)
