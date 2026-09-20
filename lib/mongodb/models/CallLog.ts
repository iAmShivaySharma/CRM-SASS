import mongoose, { Document, Schema } from 'mongoose'

export interface ICallLog extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  provider: string
  callId?: string
  direction: 'outbound' | 'inbound'
  from: string
  to: string
  status:
    | 'initiated'
    | 'ringing'
    | 'answered'
    | 'completed'
    | 'missed'
    | 'failed'
    | 'busy'
  duration?: number
  recordingUrl?: string
  leadId?: string
  contactId?: string
  notes?: string
  initiatedBy?: string
  startedAt: Date
  answeredAt?: Date
  endedAt?: Date
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const CallLogSchema = new Schema<ICallLog>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    callId: {
      type: String,
      trim: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      required: true,
    },
    from: {
      type: String,
      required: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'initiated',
        'ringing',
        'answered',
        'completed',
        'missed',
        'failed',
        'busy',
      ],
      default: 'initiated',
    },
    duration: {
      type: Number,
    },
    recordingUrl: {
      type: String,
      trim: true,
    },
    leadId: {
      type: String,
      ref: 'Lead',
    },
    contactId: {
      type: String,
      ref: 'Contact',
    },
    notes: {
      type: String,
      trim: true,
    },
    initiatedBy: {
      type: String,
      ref: 'User',
    },
    startedAt: {
      type: Date,
      required: true,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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
  CallLogSchema.index({ workspaceId: 1, createdAt: -1 })
  CallLogSchema.index({ workspaceId: 1, leadId: 1 })
  CallLogSchema.index({ workspaceId: 1, contactId: 1 })
  CallLogSchema.index({ callId: 1 }, { sparse: true })
}

export const CallLog =
  mongoose.models?.CallLog || mongoose.model<ICallLog>('CallLog', CallLogSchema)
