import mongoose, { Document, Schema } from 'mongoose'

export interface IColumn extends Document {
  name: string
  slug: string
  color: string
  projectId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  order: number
  isDefault: boolean
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const columnSchema = new Schema<IColumn>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      default: '#3b82f6',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for efficient queries
columnSchema.index({ projectId: 1, order: 1 })
columnSchema.index({ workspaceId: 1, projectId: 1 })

// Ensure unique slug per project
columnSchema.index({ projectId: 1, slug: 1 }, { unique: true })

export const Column =
  mongoose.models.Column || mongoose.model<IColumn>('Column', columnSchema)
