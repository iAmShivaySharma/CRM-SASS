import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IWorkflowExecution extends Document {
  workflowCatalogId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  n8nExecutionId: string
  status: 'pending' | 'running' | 'waiting_for_input' | 'completed' | 'failed' | 'timeout'
  inputData: Record<string, any>
  outputData: Record<string, any>
  executionTimeMs: number
  apiKeyUsed: {
    type: 'customer' | 'platform'
    provider: 'openrouter' | 'platform'
    keyId?: mongoose.Types.ObjectId
    cost?: number
    tokensUsed?: number
  }
  dynamicInput: {
    isWaitingForInput: boolean
    currentStep: number
    webhookUrl?: string
    inputSchema?: Record<string, any>
    timeoutAt?: Date
    inputHistory: Array<{
      step: number
      inputData: Record<string, any>
      receivedAt: Date
      webhookUrl: string
    }>
  }
  emailSent: boolean
  emailSentAt?: Date
  errorMessage?: string
  startedAt?: Date
  createdAt: Date
  completedAt?: Date

  // Instance methods
  markAsRunning(): Promise<IWorkflowExecution>
  markAsCompleted(outputData: any, executionTimeMs: number): Promise<IWorkflowExecution>
  markAsFailed(errorMessage: string, executionTimeMs?: number): Promise<IWorkflowExecution>
  markEmailSent(): Promise<IWorkflowExecution>
  markWaitingForInput(webhookUrl: string, inputSchema: any, timeoutMinutes?: number): Promise<IWorkflowExecution>
  receiveInput(inputData: any): Promise<IWorkflowExecution>
  markTimeout(): Promise<IWorkflowExecution>
  getCurrentInputRequirement(): any
}

export interface IWorkflowExecutionStatics {
  findByUser(userId: string, workspaceId: string, options?: any): Promise<IWorkflowExecution[]>
  findByWorkflow(workflowCatalogId: string, options?: any): Promise<IWorkflowExecution[]>
  getUsageStats(userId: string, workspaceId: string, timeframe?: number): Promise<any[]>
  getMonthlyCosts(userId: string, workspaceId: string): Promise<any[]>
  findWaitingForInput(options?: any): Promise<IWorkflowExecution[]>
  findExpiredInputs(): Promise<IWorkflowExecution[]>
  findByWebhookUrl(webhookUrl: string): Promise<IWorkflowExecution | null>
}

export interface IWorkflowExecutionModel extends Model<IWorkflowExecution>, IWorkflowExecutionStatics {}

const WorkflowExecutionSchema = new Schema<IWorkflowExecution>(
  {
    workflowCatalogId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkflowCatalog',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    n8nExecutionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'waiting_for_input', 'completed', 'failed', 'timeout'],
      default: 'pending',
      required: true,
      index: true
    },
    inputData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    outputData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    executionTimeMs: {
      type: Number,
      default: 0,
      min: 0
    },
    apiKeyUsed: {
      type: {
        type: String,
        enum: ['customer', 'platform'],
        required: true
      },
      provider: {
        type: String,
        enum: ['openrouter', 'platform'],
        required: true
      },
      keyId: {
        type: Schema.Types.ObjectId,
        ref: 'CustomerApiKey'
      },
      cost: {
        type: Number,
        min: 0,
        default: 0
      },
      tokensUsed: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    dynamicInput: {
      isWaitingForInput: {
        type: Boolean,
        default: false,
        index: true
      },
      currentStep: {
        type: Number,
        default: 0,
        min: 0
      },
      webhookUrl: {
        type: String,
        trim: true
      },
      inputSchema: {
        type: Schema.Types.Mixed
      },
      timeoutAt: {
        type: Date,
        index: true
      },
      inputHistory: [{
        step: {
          type: Number,
          required: true
        },
        inputData: {
          type: Schema.Types.Mixed,
          required: true
        },
        receivedAt: {
          type: Date,
          required: true,
          default: Date.now
        },
        webhookUrl: {
          type: String,
          required: true
        }
      }]
    },
    emailSent: {
      type: Boolean,
      default: false,
      index: true
    },
    startedAt: {
      type: Date
    },
    emailSentAt: {
      type: Date
    },
    errorMessage: {
      type: String,
      trim: true
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Indexes for performance
WorkflowExecutionSchema.index({ userId: 1, workspaceId: 1, createdAt: -1 })
WorkflowExecutionSchema.index({ workflowCatalogId: 1, status: 1 })
WorkflowExecutionSchema.index({ status: 1, createdAt: 1 })
WorkflowExecutionSchema.index({ 'apiKeyUsed.type': 1, 'apiKeyUsed.cost': 1 })
WorkflowExecutionSchema.index({ emailSent: 1, completedAt: 1 })
WorkflowExecutionSchema.index({ 'dynamicInput.isWaitingForInput': 1, 'dynamicInput.timeoutAt': 1 })
WorkflowExecutionSchema.index({ 'dynamicInput.webhookUrl': 1 })

// Virtual for execution duration in seconds
WorkflowExecutionSchema.virtual('executionTimeSeconds').get(function() {
  return Math.round(this.executionTimeMs / 1000)
})

// Virtual for formatted status
WorkflowExecutionSchema.virtual('statusDisplay').get(function() {
  return this.status.charAt(0).toUpperCase() + this.status.slice(1)
})

// Methods
WorkflowExecutionSchema.methods.markAsRunning = function() {
  this.status = 'running'
  return this.save()
}

WorkflowExecutionSchema.methods.markAsCompleted = function(outputData: any, executionTimeMs: number) {
  this.status = 'completed'
  this.outputData = outputData
  this.executionTimeMs = executionTimeMs
  this.completedAt = new Date()
  return this.save()
}

WorkflowExecutionSchema.methods.markAsFailed = function(errorMessage: string, executionTimeMs?: number) {
  this.status = 'failed'
  this.errorMessage = errorMessage
  if (executionTimeMs) {
    this.executionTimeMs = executionTimeMs
  }
  this.completedAt = new Date()
  return this.save()
}

WorkflowExecutionSchema.methods.markEmailSent = function() {
  this.emailSent = true
  this.emailSentAt = new Date()
  return this.save()
}

WorkflowExecutionSchema.methods.markWaitingForInput = function(webhookUrl: string, inputSchema: any, timeoutMinutes = 60) {
  this.status = 'waiting_for_input'
  this.dynamicInput.isWaitingForInput = true
  this.dynamicInput.currentStep += 1
  this.dynamicInput.webhookUrl = webhookUrl
  this.dynamicInput.inputSchema = inputSchema
  this.dynamicInput.timeoutAt = new Date(Date.now() + (timeoutMinutes * 60 * 1000))
  return this.save()
}

WorkflowExecutionSchema.methods.receiveInput = function(inputData: any) {
  this.dynamicInput.inputHistory.push({
    step: this.dynamicInput.currentStep,
    inputData,
    receivedAt: new Date(),
    webhookUrl: this.dynamicInput.webhookUrl
  })
  this.dynamicInput.isWaitingForInput = false
  this.dynamicInput.webhookUrl = undefined
  this.dynamicInput.inputSchema = undefined
  this.dynamicInput.timeoutAt = undefined
  this.status = 'running'
  return this.save()
}

WorkflowExecutionSchema.methods.markTimeout = function() {
  this.status = 'timeout'
  this.dynamicInput.isWaitingForInput = false
  this.completedAt = new Date()
  this.errorMessage = `Workflow timed out waiting for user input at step ${this.dynamicInput.currentStep}`
  return this.save()
}

WorkflowExecutionSchema.methods.getCurrentInputRequirement = function() {
  if (!this.dynamicInput.isWaitingForInput) return null

  return {
    step: this.dynamicInput.currentStep,
    webhookUrl: this.dynamicInput.webhookUrl,
    inputSchema: this.dynamicInput.inputSchema,
    timeoutAt: this.dynamicInput.timeoutAt,
    isExpired: this.dynamicInput.timeoutAt ? new Date() > this.dynamicInput.timeoutAt : false
  }
}

// Static methods
WorkflowExecutionSchema.statics.findByUser = function(userId: string, workspaceId: string, options: any = {}) {
  const query = { userId, workspaceId }
  const limit = options.limit || 50
  const skip = options.skip || 0

  return this.find(query)
    .populate('workflowCatalogId', 'name description category')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
}

WorkflowExecutionSchema.statics.findByWorkflow = function(workflowCatalogId: string, options: any = {}) {
  const query = { workflowCatalogId }
  const limit = options.limit || 50

  return this.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
}

WorkflowExecutionSchema.statics.getUsageStats = function(userId: string, workspaceId: string, timeframe = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - timeframe)

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        totalCost: { $sum: '$apiKeyUsed.cost' },
        totalTokens: { $sum: '$apiKeyUsed.tokensUsed' },
        avgExecutionTime: { $avg: '$executionTimeMs' },
        successfulExecutions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    {
      $addFields: {
        successRate: {
          $multiply: [
            { $divide: ['$successfulExecutions', '$totalExecutions'] },
            100
          ]
        }
      }
    }
  ])
}

WorkflowExecutionSchema.statics.getMonthlyCosts = function(userId: string, workspaceId: string) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        'apiKeyUsed.type': 'platform'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalCost: { $sum: '$apiKeyUsed.cost' },
        totalExecutions: { $sum: 1 },
        totalTokens: { $sum: '$apiKeyUsed.tokensUsed' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12
    }
  ])
}

WorkflowExecutionSchema.statics.findWaitingForInput = function(options: any = {}) {
  const query: any = {
    'dynamicInput.isWaitingForInput': true,
    'dynamicInput.timeoutAt': { $gt: new Date() }
  }

  if (options.userId) query.userId = options.userId
  if (options.workspaceId) query.workspaceId = options.workspaceId

  return this.find(query)
    .populate('workflowCatalogId', 'name description')
    .populate('userId', 'name email')
    .sort({ 'dynamicInput.timeoutAt': 1 })
}

WorkflowExecutionSchema.statics.findExpiredInputs = function() {
  return this.find({
    'dynamicInput.isWaitingForInput': true,
    'dynamicInput.timeoutAt': { $lt: new Date() }
  })
}

WorkflowExecutionSchema.statics.findByWebhookUrl = function(webhookUrl: string) {
  return this.findOne({
    'dynamicInput.webhookUrl': webhookUrl,
    'dynamicInput.isWaitingForInput': true
  })
}

// Pre-save hook to update workflow usage stats
WorkflowExecutionSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    // Update workflow catalog usage stats
    const WorkflowCatalog = mongoose.model('WorkflowCatalog')
    const workflow = await WorkflowCatalog.findById(this.workflowCatalogId)

    if (workflow) {
      await workflow.updateUsageStats(this.executionTimeMs, true)
    }
  }

  if (this.isModified('status') && this.status === 'failed') {
    // Update workflow catalog with failed execution
    const WorkflowCatalog = mongoose.model('WorkflowCatalog')
    const workflow = await WorkflowCatalog.findById(this.workflowCatalogId)

    if (workflow) {
      await workflow.updateUsageStats(this.executionTimeMs || 0, false)
    }
  }

  next()
})

export default (mongoose.models.WorkflowExecution ||
  mongoose.model<IWorkflowExecution, IWorkflowExecutionModel>('WorkflowExecution', WorkflowExecutionSchema)) as IWorkflowExecutionModel