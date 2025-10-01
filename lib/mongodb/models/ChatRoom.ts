import mongoose, { Document, Schema } from 'mongoose'

export interface IChatRoom extends Document {
  _id: string
  name: string
  description?: string
  type: 'general' | 'private' | 'direct'
  workspaceId: string
  participants: string[]
  admins: string[]
  isArchived: boolean
  lastMessage?: {
    content: string
    senderId: string
    senderName: string
    timestamp: Date
    type: 'text' | 'file' | 'image' | 'system'
  }
  settings: {
    allowFileSharing: boolean
    allowReactions: boolean
    retentionDays: number
    notifications: boolean
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
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
    type: {
      type: String,
      enum: ['general', 'private', 'direct'],
      default: 'general',
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    participants: [
      {
        type: String,
        ref: 'User',
      },
    ],
    admins: [
      {
        type: String,
        ref: 'User',
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      content: {
        type: String,
        maxlength: 1000,
      },
      senderId: {
        type: String,
        ref: 'User',
      },
      senderName: {
        type: String,
      },
      timestamp: {
        type: Date,
      },
      type: {
        type: String,
        enum: ['text', 'file', 'image', 'system'],
        default: 'text',
      },
    },
    settings: {
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowReactions: {
        type: Boolean,
        default: true,
      },
      retentionDays: {
        type: Number,
        default: 365,
        min: 1,
        max: 3650,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
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
  ChatRoomSchema.index({ workspaceId: 1, type: 1 })
  ChatRoomSchema.index({ participants: 1 })
  ChatRoomSchema.index({ workspaceId: 1, isArchived: 1, 'lastMessage.timestamp': -1 })
  ChatRoomSchema.index({ workspaceId: 1, type: 1, name: 1 }, { unique: true })
}

export const ChatRoom =
  mongoose.models?.ChatRoom ||
  mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema)