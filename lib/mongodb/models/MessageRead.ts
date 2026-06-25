import mongoose, { Document, Schema } from 'mongoose'

export interface IMessageRead extends Omit<Document, '_id'> {
  _id: string
  messageId: string
  chatRoomId: string
  userId: string
  readAt: Date
}

const MessageReadSchema = new Schema<IMessageRead>(
  {
    messageId: {
      type: String,
      ref: 'Message',
      required: true,
    },
    chatRoomId: {
      type: String,
      ref: 'ChatRoom',
      required: true,
    },
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
  {
    timestamps: false,
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
  MessageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true })
  MessageReadSchema.index({ chatRoomId: 1, userId: 1, readAt: -1 })
  MessageReadSchema.index({ readAt: 1 }, { expireAfterSeconds: 90 * 86400 })
}

export const MessageRead =
  mongoose.models?.MessageRead ||
  mongoose.model<IMessageRead>('MessageRead', MessageReadSchema)
