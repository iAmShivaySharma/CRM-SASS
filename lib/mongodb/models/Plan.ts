import mongoose, { Document, Schema } from 'mongoose'

export interface IPlan extends Document {
  _id: string
  name: string
  description?: string
  price: number
  interval: string
  features: string[]
  limits: Record<string, number>
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const PlanSchema = new Schema<IPlan>(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    interval: {
      type: String,
      enum: ['month', 'year'],
      required: true,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    limits: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Optimized indexes for performance
if (typeof window === 'undefined') {
  PlanSchema.index({ isActive: 1, sortOrder: 1 })
}

export const Plan =
  mongoose.models?.Plan || mongoose.model<IPlan>('Plan', PlanSchema)
