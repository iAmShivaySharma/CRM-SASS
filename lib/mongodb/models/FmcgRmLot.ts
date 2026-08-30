import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgRmLot extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  receiptDate: Date
  supplierId?: string
  supplierName: string
  supplierFssaiNumber?: string
  purchaseOrderNumber?: string
  materialName: string
  quantityReceived: number
  unit: string
  supplierLotNumber?: string
  internalLotNumber: string
  testStatus: 'accepted' | 'rejected' | 'under_test'
  storageLocation?: string
  remarks?: string
  receivedBy: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgRmLotSchema = new Schema<IFmcgRmLot>(
  {
    workspaceId: { type: String, required: true },
    receiptDate: { type: Date, required: true },
    supplierId: { type: String, ref: 'FmcgSupplier' },
    supplierName: { type: String, required: true, trim: true },
    supplierFssaiNumber: { type: String, trim: true },
    purchaseOrderNumber: { type: String, trim: true },
    materialName: { type: String, required: true, trim: true },
    quantityReceived: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
    supplierLotNumber: { type: String, trim: true },
    internalLotNumber: { type: String, required: true, trim: true },
    testStatus: {
      type: String,
      enum: ['accepted', 'rejected', 'under_test'],
      default: 'under_test',
    },
    storageLocation: { type: String, trim: true },
    remarks: { type: String, trim: true },
    receivedBy: { type: String, required: true },
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
  FmcgRmLotSchema.index({ workspaceId: 1, receiptDate: 1 })
  FmcgRmLotSchema.index(
    { workspaceId: 1, internalLotNumber: 1 },
    { unique: true }
  )
  FmcgRmLotSchema.index({ workspaceId: 1, materialName: 1 })
}

export const FmcgRmLot =
  mongoose.models?.FmcgRmLot ||
  mongoose.model<IFmcgRmLot>('FmcgRmLot', FmcgRmLotSchema)
