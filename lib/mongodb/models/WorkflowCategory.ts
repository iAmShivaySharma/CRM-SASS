import mongoose, { Schema, Document } from 'mongoose'

export interface IWorkflowCategory extends Document {
  name: string
  description: string
  icon: string
  sortOrder: number
  isActive: boolean
  workflowCount?: number
  createdAt: Date
  updatedAt: Date
}

const WorkflowCategorySchema = new Schema<IWorkflowCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    icon: {
      type: String,
      required: true,
      trim: true
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Virtual for workflow count
WorkflowCategorySchema.virtual('workflowCount', {
  ref: 'WorkflowCatalog',
  localField: '_id',
  foreignField: 'category',
  count: true
})

// Indexes
WorkflowCategorySchema.index({ isActive: 1, sortOrder: 1 })
WorkflowCategorySchema.index({ name: 'text', description: 'text' })

// Static methods
WorkflowCategorySchema.statics.findActiveCategories = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 })
}

WorkflowCategorySchema.statics.findWithWorkflowCounts = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'workflowcatalogs',
        localField: '_id',
        foreignField: 'category',
        as: 'workflows'
      }
    },
    {
      $addFields: {
        workflowCount: { $size: '$workflows' }
      }
    },
    {
      $project: {
        workflows: 0
      }
    },
    { $sort: { sortOrder: 1, name: 1 } }
  ])
}

export default mongoose.models.WorkflowCategory ||
  mongoose.model<IWorkflowCategory>('WorkflowCategory', WorkflowCategorySchema)