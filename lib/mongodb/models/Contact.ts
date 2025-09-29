import mongoose, { Schema, Document } from 'mongoose'

export interface IContact extends Document {
  _id: string
  workspaceId: string
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string

  // Business Information
  totalRevenue?: number
  totalPayments?: number

  // Address Information
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }

  // Milestones and Important Dates
  milestones?: Array<{
    title: string
    description?: string
    date: Date
    type: 'payment' | 'meeting' | 'contract' | 'delivery' | 'other'
    amount?: number
    status: 'completed' | 'pending' | 'cancelled'
  }>

  // Social and Web Presence
  website?: string
  linkedIn?: string
  twitter?: string

  // Lead Source Information
  originalLeadId?: string
  convertedFromLead?: boolean
  leadConversionDate?: Date

  // Custom Fields - Flexible key-value storage
  customData?: Record<string, any>

  // Tags and Categories
  tagIds?: string[]
  category?: 'client' | 'prospect' | 'partner' | 'vendor' | 'other'

  // Relationship Management
  assignedTo?: string
  accountManager?: string

  // Status and Priority
  status: 'active' | 'inactive' | 'archived'
  priority: 'low' | 'medium' | 'high'

  // Notes and Communication
  notes?: string
  lastContactDate?: Date
  nextFollowUpDate?: Date

  // Metadata
  createdBy: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['payment', 'meeting', 'contract', 'delivery', 'other'],
      default: 'other',
    },
    amount: { type: Number },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'pending',
    },
  },
  { _id: true }
)

const AddressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  { _id: false }
)

const ContactSchema = new Schema<IContact>(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      validate: {
        validator: function (v: string) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        },
        message: 'Invalid email format',
      },
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    position: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Business Information
    totalRevenue: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalPayments: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Address Information
    address: AddressSchema,

    // Milestones
    milestones: [MilestoneSchema],

    // Social and Web Presence
    website: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    linkedIn: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    twitter: {
      type: String,
      trim: true,
      maxlength: 255,
    },

    // Lead Source Information
    originalLeadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
    },
    convertedFromLead: {
      type: Boolean,
      default: false,
    },
    leadConversionDate: { type: Date },

    // Custom Fields - Flexible storage
    customData: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Tags and Categories
    tagIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    category: {
      type: String,
      enum: ['client', 'prospect', 'partner', 'vendor', 'other'],
      default: 'prospect',
    },

    // Relationship Management
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    accountManager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Status and Priority
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // Notes and Communication
    notes: {
      type: String,
      maxlength: 2000,
    },
    lastContactDate: { type: Date },
    nextFollowUpDate: { type: Date },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for performance
ContactSchema.index({ workspaceId: 1, name: 1 })
ContactSchema.index({ workspaceId: 1, email: 1 })
ContactSchema.index({ workspaceId: 1, company: 1 })
ContactSchema.index({ workspaceId: 1, status: 1 })
ContactSchema.index({ workspaceId: 1, assignedTo: 1 })
ContactSchema.index({ workspaceId: 1, createdAt: -1 })
ContactSchema.index({ originalLeadId: 1 })

// Virtual for full address
ContactSchema.virtual('fullAddress').get(function () {
  if (!this.address) return ''
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.zipCode,
    this.address.country,
  ].filter(Boolean)
  return parts.join(', ')
})

// Virtual for total milestone value
ContactSchema.virtual('totalMilestoneValue').get(function () {
  if (!this.milestones || this.milestones.length === 0) return 0
  return this.milestones
    .filter(m => m.status === 'completed' && m.amount)
    .reduce((total, m) => total + (m.amount || 0), 0)
})

// Pre-save middleware
ContactSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

export const Contact =
  mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema)
