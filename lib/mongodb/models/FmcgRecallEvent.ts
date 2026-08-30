import mongoose, { Document, Schema } from 'mongoose'

export interface IDistributorNotification {
  recipientName: string
  recipientContact: string
  notifiedAt: Date
  channel: 'email' | 'phone' | 'whatsapp'
  acknowledged: boolean
  quantityHeld?: number
}

export interface IFmcgRecallEvent extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  recallNumber: string
  recallClass: 'I' | 'II' | 'III'
  status: 'initiated' | 'in_progress' | 'closed'
  trigger:
    | 'internal_testing'
    | 'consumer_complaint'
    | 'distributor_report'
    | 'fssai_alert'
    | 'audit_finding'
    | 'supplier_notification'
    | 'batch_record_error'
    | 'labelling_error'
  affectedBatchNumbers: string[]
  affectedProductIds: string[]
  description: string
  initiatedAt: Date
  initiatedBy: string
  fssaiNotificationAt?: Date
  fssaiReferenceNumber?: string
  distributorNotifications?: IDistributorNotification[]
  quantityManufactured?: number
  quantityDistributed?: number
  quantityInStock?: number
  quantityRecalled?: number
  quantityReturned?: number
  disposalMethod?: string
  disposalDate?: Date
  disposalSupervisor?: string
  rootCause?: string
  correctiveActions?: string
  preventiveActions?: string
  closedAt?: Date
  closedBy?: string
  finalReportUrl?: string
  mockDrill: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgRecallEventSchema = new Schema<IFmcgRecallEvent>(
  {
    workspaceId: { type: String, required: true },
    recallNumber: { type: String, required: true, trim: true },
    recallClass: {
      type: String,
      enum: ['I', 'II', 'III'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'in_progress', 'closed'],
      default: 'initiated',
    },
    trigger: {
      type: String,
      enum: [
        'internal_testing',
        'consumer_complaint',
        'distributor_report',
        'fssai_alert',
        'audit_finding',
        'supplier_notification',
        'batch_record_error',
        'labelling_error',
      ],
      required: true,
    },
    affectedBatchNumbers: [{ type: String }],
    affectedProductIds: [{ type: String }],
    description: { type: String, required: true, trim: true },
    initiatedAt: { type: Date, required: true },
    initiatedBy: { type: String, required: true, trim: true },
    fssaiNotificationAt: { type: Date },
    fssaiReferenceNumber: { type: String, trim: true },
    distributorNotifications: [
      {
        recipientName: { type: String, required: true, trim: true },
        recipientContact: { type: String, required: true, trim: true },
        notifiedAt: { type: Date, required: true },
        channel: {
          type: String,
          enum: ['email', 'phone', 'whatsapp'],
          required: true,
        },
        acknowledged: { type: Boolean, default: false },
        quantityHeld: { type: Number },
      },
    ],
    quantityManufactured: { type: Number },
    quantityDistributed: { type: Number },
    quantityInStock: { type: Number },
    quantityRecalled: { type: Number },
    quantityReturned: { type: Number },
    disposalMethod: { type: String, trim: true },
    disposalDate: { type: Date },
    disposalSupervisor: { type: String, trim: true },
    rootCause: { type: String, trim: true },
    correctiveActions: { type: String, trim: true },
    preventiveActions: { type: String, trim: true },
    closedAt: { type: Date },
    closedBy: { type: String, trim: true },
    finalReportUrl: { type: String, trim: true },
    mockDrill: { type: Boolean, default: false },
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
  FmcgRecallEventSchema.index(
    { workspaceId: 1, recallNumber: 1 },
    { unique: true }
  )
  FmcgRecallEventSchema.index({ workspaceId: 1, initiatedAt: 1 })
  FmcgRecallEventSchema.index({ workspaceId: 1, status: 1 })
}

export const FmcgRecallEvent =
  mongoose.models?.FmcgRecallEvent ||
  mongoose.model<IFmcgRecallEvent>('FmcgRecallEvent', FmcgRecallEventSchema)
