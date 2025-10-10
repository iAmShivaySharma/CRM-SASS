import mongoose, { Schema, Document } from 'mongoose'

export interface IWorkflowCatalog extends Document {
  n8nWorkflowId: string
  name: string
  description: string
  category: mongoose.Types.ObjectId
  tags: string[]
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
  isActive: boolean
  requiresApiKey: boolean
  estimatedCost: number
  apiKeyProvider: 'openrouter' | 'platform'
  emailTemplateId?: mongoose.Types.ObjectId
  n8nData: {
    versionId: string
    nodes: any[]
    connections: Record<string, any>
    settings?: Record<string, any>
    active: boolean
    lastSyncAt: Date
  }
  usage: {
    totalExecutions: number
    lastExecutedAt?: Date
    avgExecutionTime: number
    successRate: number
  }
  createdAt: Date
  updatedAt: Date
}

const WorkflowCatalogSchema = new Schema<IWorkflowCatalog>(
  {
    n8nWorkflowId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'WorkflowCategory',
      required: true,
      index: true
    },
    tags: [{
      type: String,
      trim: true
    }],
    inputSchema: {
      type: Schema.Types.Mixed,
      default: {}
    },
    outputSchema: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    requiresApiKey: {
      type: Boolean,
      default: true,
      index: true
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0
    },
    apiKeyProvider: {
      type: String,
      enum: ['openrouter', 'platform'],
      default: 'openrouter'
    },
    emailTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'ExecutionEmailTemplate'
    },
    n8nData: {
      versionId: {
        type: String,
        required: true
      },
      nodes: [{
        type: Schema.Types.Mixed
      }],
      connections: {
        type: Schema.Types.Mixed,
        default: {}
      },
      settings: {
        type: Schema.Types.Mixed,
        default: {}
      },
      active: {
        type: Boolean,
        default: true
      },
      lastSyncAt: {
        type: Date,
        default: Date.now
      }
    },
    usage: {
      totalExecutions: {
        type: Number,
        default: 0
      },
      lastExecutedAt: {
        type: Date
      },
      avgExecutionTime: {
        type: Number,
        default: 0
      },
      successRate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Indexes for performance
WorkflowCatalogSchema.index({ name: 'text', description: 'text', tags: 'text' })
WorkflowCatalogSchema.index({ isActive: 1, requiresApiKey: 1 })
WorkflowCatalogSchema.index({ category: 1, isActive: 1 })
WorkflowCatalogSchema.index({ 'usage.totalExecutions': -1 })
WorkflowCatalogSchema.index({ updatedAt: -1 })

// Virtual for popularity
WorkflowCatalogSchema.virtual('popularity').get(function() {
  return this.usage.totalExecutions || 0
})

// Methods
WorkflowCatalogSchema.methods.updateUsageStats = function(executionTime: number, success: boolean) {
  this.usage.totalExecutions += 1
  this.usage.lastExecutedAt = new Date()

  // Update average execution time
  if (this.usage.avgExecutionTime === 0) {
    this.usage.avgExecutionTime = executionTime
  } else {
    this.usage.avgExecutionTime = (this.usage.avgExecutionTime + executionTime) / 2
  }

  // Update success rate
  const currentSuccessCount = Math.floor((this.usage.successRate / 100) * (this.usage.totalExecutions - 1))
  const newSuccessCount = success ? currentSuccessCount + 1 : currentSuccessCount
  this.usage.successRate = (newSuccessCount / this.usage.totalExecutions) * 100

  return this.save()
}

WorkflowCatalogSchema.methods.syncFromN8n = function(n8nWorkflow: any, analysis: any) {
  this.name = n8nWorkflow.name
  this.n8nData.versionId = n8nWorkflow.versionId
  this.n8nData.nodes = n8nWorkflow.nodes
  this.n8nData.connections = n8nWorkflow.connections
  this.n8nData.settings = n8nWorkflow.settings
  this.n8nData.active = n8nWorkflow.active
  this.n8nData.lastSyncAt = new Date()

  // Update analysis data
  this.requiresApiKey = analysis.requiresApiKey
  this.estimatedCost = analysis.estimatedCost
  this.inputSchema = analysis.inputSchema
  this.outputSchema = analysis.outputSchema

  return this.save()
}

// Static methods
WorkflowCatalogSchema.statics.findActiveWorkflows = function() {
  return this.find({ isActive: true }).populate('category')
}

WorkflowCatalogSchema.statics.findByCategory = function(categoryId: string) {
  return this.find({ category: categoryId, isActive: true }).populate('category')
}

WorkflowCatalogSchema.statics.searchWorkflows = function(query: string) {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).populate('category')
}

WorkflowCatalogSchema.statics.getPopularWorkflows = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'usage.totalExecutions': -1 })
    .limit(limit)
    .populate('category')
}

export default mongoose.models.WorkflowCatalog ||
  mongoose.model<IWorkflowCatalog>('WorkflowCatalog', WorkflowCatalogSchema)