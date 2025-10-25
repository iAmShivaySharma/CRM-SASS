import mongoose, { Schema, Document } from 'mongoose'

export interface IEmailTemplate extends Document {
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId

  name: string
  description?: string
  category: 'sales' | 'marketing' | 'support' | 'onboarding' | 'follow-up' | 'custom'

  // Template content
  subject: string
  bodyHtml: string
  bodyText?: string

  // Template variables for personalization
  variables: Array<{
    name: string
    placeholder: string
    defaultValue?: string
    required: boolean
    type: 'text' | 'email' | 'number' | 'date' | 'url'
  }>

  // Usage tracking
  stats: {
    timesUsed: number
    lastUsedAt?: Date
    clickThroughRate?: number
    openRate?: number
  }

  // Template settings
  isActive: boolean
  isShared: boolean // Share with workspace
  isSystem: boolean // System/default templates

  // Automation
  automationTriggers?: Array<{
    trigger: 'lead_created' | 'lead_converted' | 'task_completed' | 'project_created' | 'custom'
    conditions?: any
    delay?: number // minutes
  }>

  createdAt: Date
  updatedAt: Date
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
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

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['sales', 'marketing', 'support', 'onboarding', 'follow-up', 'custom'],
      default: 'custom',
      index: true
    },

    // Template content
    subject: {
      type: String,
      required: true,
      trim: true
    },
    bodyHtml: {
      type: String,
      required: true
    },
    bodyText: {
      type: String
    },

    // Template variables
    variables: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      placeholder: {
        type: String,
        required: true,
        trim: true
      },
      defaultValue: {
        type: String,
        trim: true
      },
      required: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        enum: ['text', 'email', 'number', 'date', 'url'],
        default: 'text'
      }
    }],

    // Usage tracking
    stats: {
      timesUsed: {
        type: Number,
        default: 0,
        min: 0
      },
      lastUsedAt: {
        type: Date
      },
      clickThroughRate: {
        type: Number,
        min: 0,
        max: 100
      },
      openRate: {
        type: Number,
        min: 0,
        max: 100
      }
    },

    // Template settings
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isShared: {
      type: Boolean,
      default: false,
      index: true
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true
    },

    // Automation
    automationTriggers: [{
      trigger: {
        type: String,
        enum: ['lead_created', 'lead_converted', 'task_completed', 'project_created', 'custom'],
        required: true
      },
      conditions: {
        type: Schema.Types.Mixed
      },
      delay: {
        type: Number,
        min: 0,
        default: 0
      }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Compound indexes
EmailTemplateSchema.index({ userId: 1, workspaceId: 1, isActive: 1 })
EmailTemplateSchema.index({ workspaceId: 1, isShared: 1, isActive: 1 })
EmailTemplateSchema.index({ category: 1, isActive: 1 })
EmailTemplateSchema.index({ isSystem: 1, category: 1 })

// Text search index
EmailTemplateSchema.index({
  name: 'text',
  description: 'text',
  subject: 'text'
}, {
  weights: {
    name: 10,
    subject: 5,
    description: 1
  }
})

// Virtual for variable count
EmailTemplateSchema.virtual('variableCount').get(function() {
  return this.variables?.length || 0
})

// Virtual for automation status
EmailTemplateSchema.virtual('hasAutomation').get(function() {
  return (this.automationTriggers?.length || 0) > 0
})

// Instance methods
EmailTemplateSchema.methods.recordUsage = function() {
  this.stats.timesUsed += 1
  this.stats.lastUsedAt = new Date()
  return this.save()
}

EmailTemplateSchema.methods.updateStats = function(openRate?: number, clickThroughRate?: number) {
  if (openRate !== undefined) {
    this.stats.openRate = openRate
  }
  if (clickThroughRate !== undefined) {
    this.stats.clickThroughRate = clickThroughRate
  }
  return this.save()
}

EmailTemplateSchema.methods.renderTemplate = function(variables: Record<string, any>) {
  let subject = this.subject
  let bodyHtml = this.bodyHtml
  let bodyText = this.bodyText || ''

  // Replace variables in subject
  this.variables.forEach((variable: { name: string; placeholder: string; defaultValue?: string; required: boolean; type: string }) => {
    const value = variables[variable.name] || variable.defaultValue || variable.placeholder
    const regex = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g')

    subject = subject.replace(regex, value)
    bodyHtml = bodyHtml.replace(regex, value)
    bodyText = bodyText.replace(regex, value)
  })

  return {
    subject,
    bodyHtml,
    bodyText
  }
}

EmailTemplateSchema.methods.validateVariables = function(variables: Record<string, any>) {
  const errors: string[] = []

  this.variables.forEach((variable: { name: string; placeholder: string; defaultValue?: string; required: boolean; type: string }) => {
    if (variable.required && !variables[variable.name]) {
      errors.push(`Variable '${variable.name}' is required`)
      return
    }

    const value = variables[variable.name]
    if (!value) return

    // Type validation
    switch (variable.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors.push(`Variable '${variable.name}' must be a valid email`)
        }
        break
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`Variable '${variable.name}' must be a number`)
        }
        break
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`Variable '${variable.name}' must be a valid date`)
        }
        break
      case 'url':
        try {
          new URL(value)
        } catch {
          errors.push(`Variable '${variable.name}' must be a valid URL`)
        }
        break
    }
  })

  return errors
}

EmailTemplateSchema.methods.clone = function(newName?: string) {
  const cloned = new (this.constructor as any)({
    userId: this.userId,
    workspaceId: this.workspaceId,
    name: newName || `${this.name} (Copy)`,
    description: this.description,
    category: this.category,
    subject: this.subject,
    bodyHtml: this.bodyHtml,
    bodyText: this.bodyText,
    variables: this.variables,
    isActive: true,
    isShared: false,
    isSystem: false
  })

  return cloned.save()
}

// Static methods
EmailTemplateSchema.statics.findByCategory = function(category: string, workspaceId: string, userId?: string) {
  const query: any = {
    workspaceId,
    category,
    isActive: true,
    $or: [
      { isShared: true },
      { isSystem: true }
    ]
  }

  if (userId) {
    query.$or.push({ userId })
  }

  return this.find(query).sort({ isSystem: -1, 'stats.timesUsed': -1, name: 1 })
}

EmailTemplateSchema.statics.findByUser = function(userId: string, workspaceId: string) {
  return this.find({
    userId,
    workspaceId,
    isActive: true
  }).sort({ 'stats.timesUsed': -1, name: 1 })
}

EmailTemplateSchema.statics.findShared = function(workspaceId: string) {
  return this.find({
    workspaceId,
    isShared: true,
    isActive: true
  }).sort({ 'stats.timesUsed': -1, name: 1 })
}

EmailTemplateSchema.statics.findSystem = function() {
  return this.find({
    isSystem: true,
    isActive: true
  }).sort({ category: 1, name: 1 })
}

EmailTemplateSchema.statics.searchTemplates = function(query: string, workspaceId: string, userId?: string) {
  const searchQuery: any = {
    workspaceId,
    isActive: true,
    $text: { $search: query },
    $or: [
      { isShared: true },
      { isSystem: true }
    ]
  }

  if (userId) {
    searchQuery.$or.push({ userId })
  }

  return this.find(searchQuery, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    'stats.timesUsed': -1
  })
}

EmailTemplateSchema.statics.getPopular = function(workspaceId: string, limit: number = 10) {
  return this.find({
    workspaceId,
    isActive: true,
    'stats.timesUsed': { $gt: 0 }
  }).sort({ 'stats.timesUsed': -1 }).limit(limit)
}

EmailTemplateSchema.statics.getTemplateStats = function(workspaceId: string) {
  return this.aggregate([
    {
      $match: {
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalUsage: { $sum: '$stats.timesUsed' },
        avgOpenRate: { $avg: '$stats.openRate' },
        avgClickRate: { $avg: '$stats.clickThroughRate' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ])
}

export default mongoose.models.EmailTemplate ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema)