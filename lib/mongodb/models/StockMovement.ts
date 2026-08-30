import mongoose, { Document, Schema } from 'mongoose'

export interface IStockMovement extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  productId: string
  type: 'in' | 'out' | 'adjustment' | 'return' | 'damage'
  quantity: number
  previousStock: number
  newStock: number
  reason?: string
  referenceType?: 'purchase_order' | 'invoice' | 'manual' | 'return' | 'damage'
  referenceId?: string
  unitCost?: number
  totalCost?: number
  vendorId?: string
  notes?: string
  performedBy: string
  createdAt: Date
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    workspaceId: { type: String, ref: 'Workspace', required: true },
    productId: { type: String, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment', 'return', 'damage'],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    referenceType: {
      type: String,
      enum: ['purchase_order', 'invoice', 'manual', 'return', 'damage'],
    },
    referenceId: { type: String, trim: true },
    unitCost: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    vendorId: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    performedBy: { type: String, ref: 'User', required: true },
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

if (typeof window === 'undefined') {
  StockMovementSchema.index({ productId: 1, createdAt: -1 })
  StockMovementSchema.index({ workspaceId: 1, type: 1, createdAt: -1 })
  StockMovementSchema.index({
    workspaceId: 1,
    referenceType: 1,
    referenceId: 1,
  })
}

export const StockMovement =
  mongoose.models?.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema)
