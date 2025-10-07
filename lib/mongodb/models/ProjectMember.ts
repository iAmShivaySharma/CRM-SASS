import mongoose, { Document, Schema } from 'mongoose'

export interface IProjectMember extends Document {
  _id: string
  projectId: string
  userId: string
  roleId: string // References the existing Role model
  status: 'pending' | 'active' | 'inactive' | 'removed'
  invitedBy?: string
  invitedAt?: Date
  joinedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: {
      type: String,
      ref: 'Project',
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
  ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true })
  ProjectMemberSchema.index({ userId: 1, status: 1 })
  ProjectMemberSchema.index({ projectId: 1, roleId: 1 })
}

export const ProjectMember =
  mongoose.models?.ProjectMember ||
  mongoose.model<IProjectMember>('ProjectMember', ProjectMemberSchema)
