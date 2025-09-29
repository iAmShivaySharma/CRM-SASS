import mongoose, { Document, Schema } from 'mongoose'

export interface IActivity extends Document {
  _id: string
  workspaceId: string
  entityType: string
  entityId: string
  activityType: string
  description: string
  metadata: Record<string, any>
  performedBy: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

const ActivitySchema = new Schema<IActivity>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['lead', 'user', 'workspace', 'role', 'invitation'],
    },
    entityId: {
      type: String,
      required: true,
    },
    activityType: {
      type: String,
      required: true,
      enum: [
        'created',
        'updated',
        'deleted',
        'assigned',
        'status_changed',
        'note_added',
        'email_sent',
        'call_made',
        'meeting_scheduled',
      ],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    performedBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// Optimized indexes for performance
if (typeof window === 'undefined') {
  ActivitySchema.index({ workspaceId: 1, createdAt: -1 })
  ActivitySchema.index({ entityType: 1, entityId: 1 })
}

export const Activity =
  mongoose.models?.Activity ||
  mongoose.model<IActivity>('Activity', ActivitySchema)
