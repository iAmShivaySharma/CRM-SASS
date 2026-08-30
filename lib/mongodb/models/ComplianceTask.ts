import mongoose, { Document, Schema } from 'mongoose'

export interface IComplianceTask extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  title: string
  description?: string
  category:
    | 'llp_mca'
    | 'gst'
    | 'tds'
    | 'income_tax'
    | 'fssai'
    | 'trademark'
    | 'banking'
    | 'other'
  dueDate: Date
  financialYear: string
  period?: string
  status: 'pending' | 'completed' | 'overdue' | 'not_applicable'
  completedDate?: Date
  referenceNumber?: string
  amount?: number
  notes?: string
  reminderDays: number
  isRecurring: boolean
  recurringFrequency?: 'monthly' | 'quarterly' | 'annual'
  portalUrl?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const ComplianceTaskSchema = new Schema<IComplianceTask>(
  {
    workspaceId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'llp_mca',
        'gst',
        'tds',
        'income_tax',
        'fssai',
        'trademark',
        'banking',
        'other',
      ],
      required: true,
    },
    dueDate: { type: Date, required: true },
    financialYear: { type: String, required: true },
    period: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue', 'not_applicable'],
      default: 'pending',
    },
    completedDate: { type: Date },
    referenceNumber: { type: String },
    amount: { type: Number },
    notes: { type: String },
    reminderDays: { type: Number, default: 7 },
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
    },
    portalUrl: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

ComplianceTaskSchema.index({ workspaceId: 1, dueDate: 1 })
ComplianceTaskSchema.index({ workspaceId: 1, status: 1 })
ComplianceTaskSchema.index({ workspaceId: 1, category: 1 })

export const ComplianceTask =
  mongoose.models.ComplianceTask ||
  mongoose.model<IComplianceTask>('ComplianceTask', ComplianceTaskSchema)
