import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgDistribution extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  batchId: string
  productId: string
  dispatchDate: Date
  deliveryDate?: Date
  recipientType: 'distributor' | 'retailer' | 'wholesaler' | 'direct_customer' | 'export'
  recipientName: string
  recipientFssaiNumber?: string
  recipientGst?: string
  recipientAddress?: string
  recipientState?: string
  recipientCity?: string
  recipientPhone?: string
  invoiceNumber?: string
  quantityDispatched: number
  quantityUnit: string
  vehicleNumber?: string
  driverName?: string
  transporterName?: string
  lrNumber?: string
  status: 'dispatched' | 'in_transit' | 'delivered' | 'returned' | 'recalled'
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgDistributionSchema = new Schema<IFmcgDistribution>(
  {
    workspaceId: { type: String, required: true },
    batchId: { type: String, ref: 'FmcgBatch', required: true },
    productId: { type: String, ref: 'FmcgProduct', required: true },
    dispatchDate: { type: Date, required: true },
    deliveryDate: { type: Date },
    recipientType: {
      type: String,
      enum: ['distributor', 'retailer', 'wholesaler', 'direct_customer', 'export'],
      required: true,
    },
    recipientName: { type: String, required: true, maxlength: 200, trim: true },
    recipientFssaiNumber: { type: String, trim: true },
    recipientGst: { type: String, trim: true },
    recipientAddress: { type: String, trim: true, maxlength: 500 },
    recipientState: { type: String, trim: true },
    recipientCity: { type: String, trim: true },
    recipientPhone: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    quantityDispatched: { type: Number, required: true },
    quantityUnit: { type: String, default: 'units', trim: true },
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    transporterName: { type: String, trim: true },
    lrNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ['dispatched', 'in_transit', 'delivered', 'returned', 'recalled'],
      default: 'dispatched',
    },
    notes: { type: String, trim: true, maxlength: 1000 },
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
  FmcgDistributionSchema.index({ workspaceId: 1, batchId: 1 })
  FmcgDistributionSchema.index({ workspaceId: 1, dispatchDate: 1 })
  FmcgDistributionSchema.index({ workspaceId: 1, invoiceNumber: 1 })
}

export const FmcgDistribution =
  mongoose.models?.FmcgDistribution ||
  mongoose.model<IFmcgDistribution>('FmcgDistribution', FmcgDistributionSchema)
