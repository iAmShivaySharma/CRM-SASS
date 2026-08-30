import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgFssaiLicense extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  licenseNumber: string
  licenseType: 'registration' | 'state' | 'central'
  category?: string
  businessName: string
  businessAddress: string
  state: string
  district?: string
  pincode?: string
  issueDate: Date
  expiryDate: Date
  renewalDate?: Date
  status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'renewal_pending'
  documentUrl?: string
  remarks?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgFssaiLicenseSchema = new Schema<IFmcgFssaiLicense>(
  {
    workspaceId: { type: String, required: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseType: {
      type: String,
      enum: ['registration', 'state', 'central'],
      required: true,
    },
    category: { type: String, trim: true },
    businessName: { type: String, required: true, trim: true },
    businessAddress: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    renewalDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'cancelled', 'renewal_pending'],
      default: 'active',
    },
    documentUrl: { type: String, trim: true },
    remarks: { type: String, trim: true },
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
  FmcgFssaiLicenseSchema.index(
    { workspaceId: 1, licenseNumber: 1 },
    { unique: true }
  )
}

export const FmcgFssaiLicense =
  mongoose.models?.FmcgFssaiLicense ||
  mongoose.model<IFmcgFssaiLicense>('FmcgFssaiLicense', FmcgFssaiLicenseSchema)
