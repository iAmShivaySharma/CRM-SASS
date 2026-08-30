import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgProduct extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  name: string
  sku: string
  hsnCode?: string
  fssaiProductCode?: string
  category: string
  subCategory?: string
  description?: string
  ingredients?: string
  allergens: string[]
  netWeight?: number
  weightUnit: string
  shelfLife?: number
  storageConditions?: string
  mrp?: number
  manufacturerName: string
  manufacturerAddress: string
  brandName?: string
  countryOfOrigin: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgProductSchema = new Schema<IFmcgProduct>(
  {
    workspaceId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true },
    fssaiProductCode: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    ingredients: { type: String, trim: true, maxlength: 5000 },
    allergens: { type: [String], default: [] },
    netWeight: { type: Number },
    weightUnit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'units'],
      default: 'g',
    },
    shelfLife: { type: Number },
    storageConditions: { type: String, trim: true },
    mrp: { type: Number },
    manufacturerName: { type: String, required: true, trim: true },
    manufacturerAddress: { type: String, required: true, trim: true },
    brandName: { type: String, trim: true },
    countryOfOrigin: { type: String, default: 'India', trim: true },
    isActive: { type: Boolean, default: true },
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
  FmcgProductSchema.index({ workspaceId: 1, sku: 1 }, { unique: true })
  FmcgProductSchema.index({ workspaceId: 1, isActive: 1 })
}

export const FmcgProduct =
  mongoose.models?.FmcgProduct ||
  mongoose.model<IFmcgProduct>('FmcgProduct', FmcgProductSchema)
