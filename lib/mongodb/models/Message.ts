import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage extends Document {
  _id: string
  content: string
  type: 'text' | 'file' | 'image' | 'system'
  chatRoomId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isEdited: boolean
  editedAt?: Date
  replyTo?: string
  reactions: {
    emoji: string
    userId: string
    userName: string
  }[]
  readBy: {
    userId: string
    readAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'system'],
      default: 'text',
    },
    chatRoomId: {
      type: String,
      ref: 'ChatRoom',
      required: true,
    },
    senderId: {
      type: String,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderAvatar: {
      type: String,
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    replyTo: {
      type: String,
      ref: 'Message',
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        userId: {
          type: String,
          ref: 'User',
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
      },
    ],
    readBy: [
      {
        userId: {
          type: String,
          ref: 'User',
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
  MessageSchema.index({ chatRoomId: 1, createdAt: -1 })
  MessageSchema.index({ senderId: 1, createdAt: -1 })
  MessageSchema.index({ chatRoomId: 1, type: 1 })
}

export const Message =
  mongoose.models?.Message || mongoose.model<IMessage>('Message', MessageSchema)
