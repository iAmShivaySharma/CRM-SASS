import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUserInput extends Document {
  executionId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  step: number
  webhookUrl: string
  inputSchema: Record<string, any>
  status: 'pending' | 'received' | 'expired' | 'cancelled'
  inputData?: Record<string, any>
  timeoutAt: Date
  receivedAt?: Date
  notificationsSent: {
    email: boolean
    sms?: boolean
    realtime: boolean
  }
  metadata: {
    workflowName: string
    stepDescription?: string
    priority: 'low' | 'medium' | 'high'
    requiresImmediate: boolean
  }
  createdAt: Date
  updatedAt: Date

  // Virtuals
  timeRemaining: number
  timeRemainingMinutes: number
  isExpired: boolean

  // Instance methods
  markReceived(inputData: any): Promise<IUserInput>
  markExpired(): Promise<IUserInput>
  markCancelled(): Promise<IUserInput>
  markNotificationSent(type: 'email' | 'sms' | 'realtime'): Promise<IUserInput>
  generateInputUrl(baseUrl: string): string
  generateSecureToken(): string
  validateToken(token: string): boolean
}

export interface IUserInputStatics {
  findByUser(userId: string, workspaceId: string, options?: any): Promise<IUserInput[]>
  findPendingByUser(userId: string, workspaceId: string, options?: any): Promise<IUserInput[]>
  findExpired(): Promise<IUserInput[]>
  findByWebhookUrl(webhookUrl: string): Promise<IUserInput | null>
  findHighPriorityPending(minutes?: number): Promise<IUserInput[]>
  getInputStats(userId: string, workspaceId: string, days?: number): Promise<any[]>
}

export interface IUserInputModel extends Model<IUserInput>, IUserInputStatics {}

const UserInputSchema = new Schema<IUserInput>(
  {
    executionId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkflowExecution',
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
    step: {
      type: Number,
      required: true,
      min: 1
    },
    webhookUrl: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    inputSchema: {
      type: Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'expired', 'cancelled'],
      default: 'pending',
      required: true,
      index: true
    },
    inputData: {
      type: Schema.Types.Mixed
    },
    timeoutAt: {
      type: Date,
      required: true,
      index: true
    },
    receivedAt: {
      type: Date
    },
    notificationsSent: {
      email: {
        type: Boolean,
        default: false
      },
      sms: {
        type: Boolean,
        default: false
      },
      realtime: {
        type: Boolean,
        default: false
      }
    },
    metadata: {
      workflowName: {
        type: String,
        required: true,
        trim: true
      },
      stepDescription: {
        type: String,
        trim: true
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      requiresImmediate: {
        type: Boolean,
        default: false
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
UserInputSchema.index({ userId: 1, workspaceId: 1, status: 1 })
UserInputSchema.index({ status: 1, timeoutAt: 1 })
UserInputSchema.index({ executionId: 1, step: 1 })
UserInputSchema.index({ createdAt: -1 })
UserInputSchema.index({ 'metadata.priority': 1, timeoutAt: 1 })

// Virtual for time remaining
UserInputSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending') return 0
  const now = new Date()
  const remaining = this.timeoutAt.getTime() - now.getTime()
  return Math.max(0, remaining)
})

// Virtual for time remaining in minutes
UserInputSchema.virtual('timeRemainingMinutes').get(function() {
  return Math.floor(this.timeRemaining / (1000 * 60))
})

// Virtual for is expired
UserInputSchema.virtual('isExpired').get(function() {
  return this.status === 'pending' && new Date() > this.timeoutAt
})

// Methods
UserInputSchema.methods.markReceived = function(inputData: any) {
  this.status = 'received'
  this.inputData = inputData
  this.receivedAt = new Date()
  return this.save()
}

UserInputSchema.methods.markExpired = function() {
  this.status = 'expired'
  return this.save()
}

UserInputSchema.methods.markCancelled = function() {
  this.status = 'cancelled'
  return this.save()
}

UserInputSchema.methods.markNotificationSent = function(type: 'email' | 'sms' | 'realtime') {
  this.notificationsSent[type] = true
  return this.save()
}

UserInputSchema.methods.generateInputUrl = function(baseUrl: string) {
  return `${baseUrl}/input/${this._id}?token=${this.generateSecureToken()}`
}

UserInputSchema.methods.generateSecureToken = function() {
  // Generate a secure token for the input URL
  return Buffer.from(`${this._id}:${this.executionId}:${this.step}:${this.createdAt.getTime()}`).toString('base64')
}

UserInputSchema.methods.validateToken = function(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [id, executionId, step, timestamp] = decoded.split(':')

    return (
      id === this._id.toString() &&
      executionId === this.executionId.toString() &&
      parseInt(step) === this.step &&
      parseInt(timestamp) === this.createdAt.getTime()
    )
  } catch (error) {
    return false
  }
}

// Static methods
UserInputSchema.statics.findPendingByUser = function(userId: string, workspaceId: string) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    status: 'pending',
    timeoutAt: { $gt: new Date() }
  })
  .populate('executionId', 'workflowCatalogId status')
  .sort({ 'metadata.priority': -1, timeoutAt: 1 })
}

UserInputSchema.statics.findExpired = function() {
  return this.find({
    status: 'pending',
    timeoutAt: { $lt: new Date() }
  })
}

UserInputSchema.statics.findByWebhookUrl = function(webhookUrl: string) {
  return this.findOne({
    webhookUrl,
    status: 'pending',
    timeoutAt: { $gt: new Date() }
  })
}

UserInputSchema.statics.findHighPriorityPending = function(minutes = 15) {
  const urgentTime = new Date(Date.now() + (minutes * 60 * 1000))

  return this.find({
    status: 'pending',
    timeoutAt: { $lt: urgentTime, $gt: new Date() },
    $or: [
      { 'metadata.priority': 'high' },
      { 'metadata.requiresImmediate': true }
    ]
  })
  .populate('userId', 'name email phone')
  .populate('workspaceId', 'name')
}

UserInputSchema.statics.getInputStats = function(userId: string, workspaceId: string, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

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
        totalRequests: { $sum: 1 },
        received: { $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'received'] },
              { $subtract: ['$receivedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    },
    {
      $addFields: {
        responseRate: {
          $multiply: [
            { $divide: ['$received', '$totalRequests'] },
            100
          ]
        },
        avgResponseTimeMinutes: {
          $divide: ['$avgResponseTime', 60000]
        }
      }
    }
  ])
}

// Pre-save hooks
UserInputSchema.pre('save', function(next) {
  // Auto-expire if past timeout
  if (this.status === 'pending' && new Date() > this.timeoutAt) {
    this.status = 'expired'
  }
  next()
})

// Post-save hooks for real-time updates
UserInputSchema.post('save', function(doc) {
  // Emit real-time events for status changes
  if (doc.isModified('status')) {
    // This would integrate with your WebSocket/SSE system
    console.log(`UserInput ${doc._id} status changed to ${doc.status}`)
  }
})

export default (mongoose.models.UserInput ||
  mongoose.model<IUserInput, IUserInputModel>('UserInput', UserInputSchema)) as IUserInputModel