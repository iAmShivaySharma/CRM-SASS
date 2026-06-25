import mongoose, { Document, Schema } from 'mongoose'

export interface ISprint extends Omit<Document, '_id'> {
  _id: string
  name: string
  goal?: string
  projectId: string
  workspaceId: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: Date
  endDate: Date
  createdBy: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const SprintSchema = new Schema<ISprint>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    goal: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    projectId: {
      type: String,
      ref: 'Project',
      required: true,
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'cancelled'],
      default: 'planning',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
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
  SprintSchema.index({ projectId: 1, status: 1 })
  SprintSchema.index({ workspaceId: 1, projectId: 1, startDate: -1 })
}

export const Sprint =
  mongoose.models?.Sprint || mongoose.model<ISprint>('Sprint', SprintSchema)
