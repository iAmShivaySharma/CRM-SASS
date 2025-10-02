import mongoose, { Document, Schema } from 'mongoose'

export interface ITask extends Document {
  _id: string
  title: string
  description?: string
  projectId: string
  status: string // Flexible status system (todo, inprogress, review, done, etc.)
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  createdBy: string
  tags?: string[]
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  order: number // For Kanban ordering within status
  dependencies?: string[] // Task IDs that must be completed first
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
  customFields?: Record<string, any>
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    projectId: {
      type: String,
      ref: 'Project',
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assigneeId: {
      type: String,
      ref: 'User',
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    dueDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    dependencies: [
      {
        type: String,
        ref: 'Task',
      },
    ],
    attachments: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
      },
    ],
    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
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
  TaskSchema.index({ projectId: 1, status: 1, order: 1 })
  TaskSchema.index({ assigneeId: 1, status: 1 })
  TaskSchema.index({ workspaceId: 1, dueDate: 1 })
  TaskSchema.index({ createdBy: 1 })
  TaskSchema.index({ tags: 1 })
}

export const Task =
  mongoose.models?.Task || mongoose.model<ITask>('Task', TaskSchema)