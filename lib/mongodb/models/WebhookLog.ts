import mongoose, { Document, Schema } from 'mongoose'

export interface IWebhookLog extends Document {
  _id: string
  webhookId: string
  workspaceId: string
  requestId: string
  method: string
  url: string
  headers: Record<string, string>
  body: any
  responseStatus?: number
  responseBody?: any
  responseHeaders?: Record<string, string>
  processingTime: number
  success: boolean
  errorMessage?: string
  leadId?: string
  retryAttempt: number
  userAgent?: string
  ipAddress?: string
  createdAt: Date
}

const WebhookLogSchema = new Schema<IWebhookLog>(
  {
    webhookId: {
      type: String,
      ref: 'Webhook',
      required: true,
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    requestId: {
      type: String,
      required: true,
      default: () => require('crypto').randomUUID(),
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    url: {
      type: String,
      required: true,
    },
    headers: {
      type: Schema.Types.Mixed,
      required: true,
    },
    body: {
      type: Schema.Types.Mixed,
    },
    responseStatus: {
      type: Number,
    },
    responseBody: {
      type: Schema.Types.Mixed,
    },
    responseHeaders: {
      type: Schema.Types.Mixed,
    },
    processingTime: {
      type: Number,
      required: true,
      min: 0,
    },
    success: {
      type: Boolean,
      required: true,
      default: false,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    leadId: {
      type: String,
      ref: 'Lead',
    },
    retryAttempt: {
      type: Number,
      default: 0,
      min: 0,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Optimized indexes for performance and data management
if (typeof window === 'undefined') {
  WebhookLogSchema.index({ webhookId: 1, createdAt: -1 })
  WebhookLogSchema.index({ requestId: 1 }, { unique: true })
  // TTL index to automatically delete logs older than 90 days
  WebhookLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  )
}

export const WebhookLog =
  mongoose.models?.WebhookLog ||
  mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema)
