import mongoose, { Document, Schema } from 'mongoose'

export interface IWebhook extends Document {
  _id: string
  workspaceId: string
  name: string
  description?: string
  url: string
  secret: string
  isActive: boolean
  webhookType:
    | 'facebook_leads'
    | 'google_forms'
    | 'zapier'
    | 'custom'
    | 'mailchimp'
    | 'hubspot'
    | 'salesforce'
    | 'swipepages'
  events: string[]
  headers?: Record<string, string>
  transformationRules?: Record<string, any>
  retryConfig?: {
    maxRetries: number
    retryDelay: number
  }
  lastTriggered?: Date
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const WebhookSchema = new Schema<IWebhook>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
      default: () => require('crypto').randomBytes(32).toString('hex'),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    webhookType: {
      type: String,
      enum: [
        'facebook_leads',
        'google_forms',
        'zapier',
        'custom',
        'mailchimp',
        'hubspot',
        'salesforce',
        'swipepages',
      ],
      required: true,
    },
    events: [
      {
        type: String,
        enum: [
          'lead.created',
          'lead.updated',
          'lead.deleted',
          'contact.created',
          'contact.updated',
        ],
        default: ['lead.created'],
      },
    ],
    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    transformationRules: {
      type: Schema.Types.Mixed,
      default: {},
    },
    retryConfig: {
      maxRetries: {
        type: Number,
        default: 3,
        min: 0,
        max: 10,
      },
      retryDelay: {
        type: Number,
        default: 1000,
        min: 100,
        max: 60000,
      },
    },
    lastTriggered: {
      type: Date,
    },
    totalRequests: {
      type: Number,
      default: 0,
      min: 0,
    },
    successfulRequests: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedRequests: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: String,
      ref: 'User',
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
        // Don't expose the secret in JSON responses for security
        delete ret.secret
        return ret
      },
    },
  }
)

// Optimized indexes for performance
if (typeof window === 'undefined') {
  WebhookSchema.index({ workspaceId: 1, isActive: 1 })
  WebhookSchema.index({ url: 1 }, { unique: true })
}

export const Webhook =
  mongoose.models?.Webhook || mongoose.model<IWebhook>('Webhook', WebhookSchema)
