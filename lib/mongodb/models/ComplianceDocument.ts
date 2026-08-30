import mongoose, { Document, Schema } from 'mongoose'

export interface IComplianceDocument extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  name: string
  category:
    | 'license'
    | 'registration'
    | 'filing'
    | 'agreement'
    | 'certificate'
    | 'tax_return'
    | 'audit_report'
    | 'bank'
    | 'dsc'
    | 'other'
  documentNumber?: string
  issuedBy?: string
  issueDate?: Date
  expiryDate?: Date
  status: 'valid' | 'expiring_soon' | 'expired' | 'archived'
  documentUrl?: string
  retentionYears?: number
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const ComplianceDocumentSchema = new Schema<IComplianceDocument>(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'license',
        'registration',
        'filing',
        'agreement',
        'certificate',
        'tax_return',
        'audit_report',
        'bank',
        'dsc',
        'other',
      ],
      required: true,
    },
    documentNumber: { type: String },
    issuedBy: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['valid', 'expiring_soon', 'expired', 'archived'],
      default: 'valid',
    },
    documentUrl: { type: String },
    retentionYears: { type: Number },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

ComplianceDocumentSchema.index({ workspaceId: 1, expiryDate: 1 })
ComplianceDocumentSchema.index({ workspaceId: 1, category: 1 })

export const ComplianceDocument =
  mongoose.models.ComplianceDocument ||
  mongoose.model<IComplianceDocument>(
    'ComplianceDocument',
    ComplianceDocumentSchema
  )
