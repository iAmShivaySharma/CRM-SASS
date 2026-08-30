import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgComplaintRegister extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  referenceNumber: string
  dateReceived: Date
  source: 'consumer' | 'retailer' | 'distributor' | 'online_review' | 'internal'
  customerName?: string
  customerContact?: string
  productId?: string
  batchNumber?: string
  nature:
    | 'foreign_body'
    | 'spoilage'
    | 'illness'
    | 'labelling'
    | 'weight'
    | 'packaging'
    | 'other'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  investigatedBy?: string
  rootCauseFound?: string
  actionTaken:
    | 'replacement'
    | 'refund'
    | 'recall_initiated'
    | 'no_action'
    | 'under_investigation'
  closedDate?: Date
  customerInformed: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgComplaintRegisterSchema = new Schema<IFmcgComplaintRegister>(
  {
    workspaceId: { type: String, required: true },
    referenceNumber: { type: String, required: true, trim: true },
    dateReceived: { type: Date, required: true },
    source: {
      type: String,
      enum: [
        'consumer',
        'retailer',
        'distributor',
        'online_review',
        'internal',
      ],
      required: true,
    },
    customerName: { type: String, trim: true },
    customerContact: { type: String, trim: true },
    productId: { type: String, ref: 'FmcgProduct' },
    batchNumber: { type: String, trim: true },
    nature: {
      type: String,
      enum: [
        'foreign_body',
        'spoilage',
        'illness',
        'labelling',
        'weight',
        'packaging',
        'other',
      ],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    investigatedBy: { type: String, trim: true },
    rootCauseFound: { type: String, trim: true },
    actionTaken: {
      type: String,
      enum: [
        'replacement',
        'refund',
        'recall_initiated',
        'no_action',
        'under_investigation',
      ],
      required: true,
    },
    closedDate: { type: Date },
    customerInformed: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
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

if (typeof window === 'undefined') {
  FmcgComplaintRegisterSchema.index(
    { workspaceId: 1, referenceNumber: 1 },
    { unique: true }
  )
  FmcgComplaintRegisterSchema.index({ workspaceId: 1, dateReceived: 1 })
  FmcgComplaintRegisterSchema.index({ workspaceId: 1, severity: 1 })
}

export const FmcgComplaintRegister =
  mongoose.models?.FmcgComplaintRegister ||
  mongoose.model<IFmcgComplaintRegister>(
    'FmcgComplaintRegister',
    FmcgComplaintRegisterSchema
  )
