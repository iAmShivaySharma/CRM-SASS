import mongoose, { Document, Schema } from 'mongoose'

export interface IWorkspaceMember extends Document {
  _id: string
  workspaceId: string
  userId: string
  roleId: string
  status: string
  invitedBy?: string
  invitedAt?: Date
  joinedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    roleId: {
      type: String,
      ref: 'Role',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'removed'],
      default: 'active',
    },
    invitedBy: {
      type: String,
      ref: 'User',
    },
    invitedAt: {
      type: Date,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
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
  WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true })
  WorkspaceMemberSchema.index({ userId: 1, status: 1 })
}

export const WorkspaceMember =
  mongoose.models?.WorkspaceMember ||
  mongoose.model<IWorkspaceMember>('WorkspaceMember', WorkspaceMemberSchema)
