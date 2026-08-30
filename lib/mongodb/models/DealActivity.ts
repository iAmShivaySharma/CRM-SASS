import mongoose, { Document, Schema } from 'mongoose'

export interface IDealActivity extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  dealId: string
  type:
    | 'created'
    | 'updated'
    | 'stage_changed'
    | 'assigned'
    | 'won'
    | 'lost'
    | 'abandoned'
    | 'reopened'
    | 'note_added'
    | 'value_changed'
  description: string
  metadata?: Record<string, any>
  performedBy: string
  createdAt: Date
}

const DealActivitySchema = new Schema<IDealActivity>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    dealId: {
      type: String,
      ref: 'Deal',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'created',
        'updated',
        'stage_changed',
        'assigned',
        'won',
        'lost',
        'abandoned',
        'reopened',
        'note_added',
        'value_changed',
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
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
  DealActivitySchema.index({ dealId: 1, createdAt: -1 })
  DealActivitySchema.index({ workspaceId: 1, createdAt: -1 })
  DealActivitySchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  )
}

export const DealActivity =
  mongoose.models?.DealActivity ||
  mongoose.model<IDealActivity>('DealActivity', DealActivitySchema)
