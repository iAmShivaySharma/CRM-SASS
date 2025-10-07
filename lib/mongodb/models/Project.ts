import mongoose, { Document, Schema } from 'mongoose'

export interface IProject extends Document {
  _id: string
  name: string
  description?: string
  slug: string
  icon?: string
  color: string
  status: 'active' | 'archived' | 'completed'
  visibility: 'private' | 'workspace' | 'public'
  startDate?: Date
  endDate?: Date
  workspaceId: string
  createdBy: string
  settings: {
    allowMemberInvite: boolean
    allowJoinRequests: boolean
    defaultTaskStatus: string
    enableTimeTracking: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>(
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
      maxlength: 1000,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug can only contain lowercase letters, numbers, and hyphens',
      ],
    },
    icon: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      default: '#3b82f6',
      match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color'],
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    visibility: {
      type: String,
      enum: ['private', 'workspace', 'public'],
      default: 'workspace',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
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
    settings: {
      allowMemberInvite: {
        type: Boolean,
        default: true,
      },
      allowJoinRequests: {
        type: Boolean,
        default: true,
      },
      defaultTaskStatus: {
        type: String,
        default: 'todo',
      },
      enableTimeTracking: {
        type: Boolean,
        default: false,
      },
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

// Compound index for workspace + slug uniqueness
if (typeof window === 'undefined') {
  ProjectSchema.index({ workspaceId: 1, slug: 1 }, { unique: true })
  ProjectSchema.index({ workspaceId: 1, status: 1 })
  ProjectSchema.index({ createdBy: 1 })
}

export const Project =
  mongoose.models?.Project || mongoose.model<IProject>('Project', ProjectSchema)
