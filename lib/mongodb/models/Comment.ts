import mongoose, { Document, Schema } from 'mongoose'

export interface ICommentEditHistory {
  content: string
  editedBy: string
  editedAt: Date
}

export interface IComment extends Omit<Document, '_id'> {
  _id: string
  content: string
  entityType: 'task' | 'project' | 'document'
  entityId: string
  parentId?: string
  workspaceId: string
  createdBy: string
  isEdited: boolean
  editedAt?: Date
  editHistory: ICommentEditHistory[]
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: string
  createdAt: Date
  updatedAt: Date
}

const CommentEditHistorySchema = new Schema<ICommentEditHistory>(
  {
    content: { type: String, required: true },
    editedBy: { type: String, ref: 'User', required: true },
    editedAt: { type: Date, required: true },
  },
  { _id: false }
)

const CommentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    entityType: {
      type: String,
      enum: ['task', 'project', 'document'],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    parentId: {
      type: String,
      ref: 'Comment',
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    editHistory: {
      type: [CommentEditHistorySchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: String,
      ref: 'User',
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

if (typeof window === 'undefined') {
  CommentSchema.index({ entityType: 1, entityId: 1, createdAt: 1 })
  CommentSchema.index({ parentId: 1 })
  CommentSchema.index({ workspaceId: 1, entityType: 1, entityId: 1 })
}

export const Comment =
  mongoose.models?.Comment || mongoose.model<IComment>('Comment', CommentSchema)
