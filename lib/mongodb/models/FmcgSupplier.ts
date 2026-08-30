import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgSupplier extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  name: string
  code?: string
  fssaiLicenseNumber?: string
  fssaiLicenseExpiry?: Date
  gstNumber?: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  state?: string
  city?: string
  pincode?: string
  categories: string[]
  approvalStatus: 'pending' | 'approved' | 'suspended' | 'blacklisted'
  approvalDate?: Date
  approvalNotes?: string
  rating?: number
  notes?: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgSupplierSchema = new Schema<IFmcgSupplier>(
  {
    workspaceId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 200, trim: true },
    code: { type: String, trim: true },
    fssaiLicenseNumber: { type: String, trim: true },
    fssaiLicenseExpiry: { type: Date },
    gstNumber: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true, maxlength: 500 },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    pincode: { type: String, trim: true },
    categories: { type: [String], default: [] },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'suspended', 'blacklisted'],
      default: 'pending',
    },
    approvalDate: { type: Date },
    approvalNotes: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String, trim: true, maxlength: 1000 },
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
  FmcgSupplierSchema.index({ workspaceId: 1, name: 1 })
  FmcgSupplierSchema.index({ workspaceId: 1, approvalStatus: 1 })
}

export const FmcgSupplier =
  mongoose.models?.FmcgSupplier ||
  mongoose.model<IFmcgSupplier>('FmcgSupplier', FmcgSupplierSchema)
