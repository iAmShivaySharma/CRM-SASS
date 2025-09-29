import mongoose, { Document, Schema } from 'mongoose'

export interface IWorkspace extends Document {
  _id: string
  name: string
  slug: string
  description?: string
  currency: string
  timezone: string
  planId: string
  subscriptionStatus: string
  dodoCustomerId?: string
  dodoSubscriptionId?: string
  settings: {
    dateFormat: string
    timeFormat: string
    weekStartsOn: number
    language: string
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug can only contain lowercase letters, numbers, and hyphens',
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      enum: [
        'USD',
        'EUR',
        'GBP',
        'JPY',
        'AUD',
        'CAD',
        'CHF',
        'CNY',
        'SEK',
        'NZD',
        'MXN',
        'SGD',
        'HKD',
        'NOK',
        'TRY',
        'RUB',
        'INR',
        'BRL',
        'ZAR',
        'KRW',
      ],
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },
    settings: {
      dateFormat: {
        type: String,
        default: 'MM/DD/YYYY',
        enum: [
          'MM/DD/YYYY',
          'DD/MM/YYYY',
          'YYYY-MM-DD',
          'DD-MM-YYYY',
          'MM-DD-YYYY',
        ],
      },
      timeFormat: {
        type: String,
        default: '12h',
        enum: ['12h', '24h'],
      },
      weekStartsOn: {
        type: Number,
        default: 0, // Sunday
        min: 0,
        max: 6,
      },
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      },
    },
    planId: {
      type: String,
      ref: 'Plan',
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
      default: 'active',
    },
    dodoCustomerId: {
      type: String,
      sparse: true,
    },
    dodoSubscriptionId: {
      type: String,
      sparse: true,
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
        return ret
      },
    },
  }
)

// Optimized indexes for performance
if (typeof window === 'undefined') {
  WorkspaceSchema.index({ subscriptionStatus: 1, planId: 1 })
}

export const Workspace =
  mongoose.models?.Workspace ||
  mongoose.model<IWorkspace>('Workspace', WorkspaceSchema)
