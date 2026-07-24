import mongoose, { Schema } from 'mongoose'

export interface IMeeting {
  workspaceId: string
  chatRoomId?: string
  title: string
  description?: string
  type: 'voice' | 'video' | 'scheduled'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  scheduledAt?: Date
  startedAt?: Date
  endedAt?: Date
  duration?: number
  organizer: string
  participants: {
    userId: string
    joinedAt?: Date
    leftAt?: Date
    role: 'organizer' | 'participant'
  }[]
  recordingUrl?: string
  notes?: string
  aiSummary?: string
  actionItems?: string[]
  linkedLeadId?: string
  linkedContactId?: string
  createdAt: Date
  updatedAt: Date
}

const MeetingParticipantSchema = new Schema(
  {
    userId: { type: String, ref: 'User', required: true },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    role: {
      type: String,
      enum: ['organizer', 'participant'],
      default: 'participant',
    },
  },
  { _id: false }
)

const MeetingSchema = new Schema<IMeeting>(
  {
    workspaceId: { type: String, required: true, index: true },
    chatRoomId: { type: String, ref: 'ChatRoom' },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    type: {
      type: String,
      enum: ['voice', 'video', 'scheduled'],
      default: 'voice',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number },
    organizer: { type: String, ref: 'User', required: true },
    participants: [MeetingParticipantSchema],
    recordingUrl: { type: String },
    notes: { type: String },
    aiSummary: { type: String },
    actionItems: [{ type: String }],
    linkedLeadId: { type: String, ref: 'Lead' },
    linkedContactId: { type: String, ref: 'Contact' },
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
  MeetingSchema.index({ workspaceId: 1, status: 1, scheduledAt: -1 })
  MeetingSchema.index({ organizer: 1, status: 1 })
  MeetingSchema.index({ chatRoomId: 1 })
}

export const Meeting =
  mongoose.models?.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema)
