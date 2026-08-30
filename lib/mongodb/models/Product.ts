import mongoose, { Document, Schema } from 'mongoose'

export interface IProduct extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  name: string
  sku: string
  description?: string
  category?: string
  hsnSac?: string
  unit: string
  buyPrice: number
  sellPrice: number
  taxRate: number
  currency: string
  currentStock: number
  lowStockThreshold: number
  location?: string
  barcode?: string
  imageUrl?: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    workspaceId: { type: String, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 1000 },
    category: { type: String, trim: true, maxlength: 50 },
    hsnSac: { type: String, trim: true, maxlength: 20 },
    unit: { type: String, default: 'pcs', trim: true, maxlength: 20 },
    buyPrice: { type: Number, default: 0, min: 0 },
    sellPrice: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    currency: { type: String, default: 'INR', trim: true, maxlength: 5 },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    location: { type: String, trim: true, maxlength: 100 },
    barcode: { type: String, trim: true, maxlength: 50 },
    imageUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, ref: 'User', required: true },
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
  ProductSchema.index({ workspaceId: 1, isActive: 1 })
  ProductSchema.index({ workspaceId: 1, sku: 1 }, { unique: true })
  ProductSchema.index({ workspaceId: 1, category: 1 })
  ProductSchema.index({ workspaceId: 1, currentStock: 1, lowStockThreshold: 1 })
  ProductSchema.index({ workspaceId: 1, barcode: 1 }, { sparse: true })
  ProductSchema.index(
    { name: 'text', sku: 'text', description: 'text', barcode: 'text' },
    { weights: { sku: 10, name: 5, barcode: 3, description: 1 } }
  )
}

export const Product =
  mongoose.models?.Product || mongoose.model<IProduct>('Product', ProductSchema)
