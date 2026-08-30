import mongoose, { Document, Schema } from 'mongoose'

export interface IQuotationItem {
  name: string
  description?: string
  hsnSac?: string
  quantity: number
  unit: string
  rate: number
  discount: number
  discountType: 'percentage' | 'flat'
  taxRate: number
  taxAmount: number
  amount: number
}

export interface IQuotation extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  quotationNumber: string
  version: number
  status:
    | 'draft'
    | 'sent'
    | 'viewed'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | 'converted'

  contactId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerGstin?: string
  customerAddress?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }

  dealId?: string
  subject: string
  validUntil?: Date
  quotationDate: Date

  items: IQuotationItem[]

  subtotal: number
  totalDiscount: number
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  roundOff: number
  grandTotal: number
  currency: string

  isInterState: boolean
  sellerState?: string

  notes?: string
  termsAndConditions?: string
  internalNotes?: string

  acceptedAt?: Date
  acceptedBy?: string
  rejectedAt?: Date
  rejectionReason?: string

  convertedToInvoiceId?: string
  convertedAt?: Date

  sentAt?: Date
  viewedAt?: Date

  approvalRequired: boolean
  approvedBy?: string
  approvedAt?: Date

  pdfUrl?: string

  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const QuotationItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    hsnSac: { type: String, trim: true, maxlength: 20 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'pcs', trim: true, maxlength: 20 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
)

const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
  },
  { _id: false }
)

const QuotationSchema = new Schema<IQuotation>(
  {
    workspaceId: { type: String, ref: 'Workspace', required: true },
    quotationNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    version: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'viewed',
        'accepted',
        'rejected',
        'expired',
        'converted',
      ],
      default: 'draft',
    },

    contactId: { type: String, ref: 'Contact' },
    customerName: { type: String, required: true, trim: true, maxlength: 200 },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true, maxlength: 20 },
    customerGstin: { type: String, trim: true, maxlength: 15 },
    customerAddress: AddressSchema,

    dealId: { type: String, ref: 'Deal' },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    validUntil: { type: Date },
    quotationDate: { type: Date, required: true, default: Date.now },

    items: [QuotationItemSchema],

    subtotal: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, default: 0, min: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', trim: true, maxlength: 5 },

    isInterState: { type: Boolean, default: false },
    sellerState: { type: String, trim: true },

    notes: { type: String, trim: true, maxlength: 2000 },
    termsAndConditions: { type: String, trim: true, maxlength: 5000 },
    internalNotes: { type: String, trim: true, maxlength: 1000 },

    acceptedAt: { type: Date },
    acceptedBy: { type: String, trim: true },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500 },

    convertedToInvoiceId: { type: String, ref: 'Invoice' },
    convertedAt: { type: Date },

    sentAt: { type: Date },
    viewedAt: { type: Date },

    approvalRequired: { type: Boolean, default: false },
    approvedBy: { type: String, ref: 'User' },
    approvedAt: { type: Date },

    pdfUrl: { type: String },

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
  QuotationSchema.index({ workspaceId: 1, status: 1, createdAt: -1 })
  QuotationSchema.index(
    { workspaceId: 1, quotationNumber: 1 },
    { unique: true }
  )
  QuotationSchema.index({ workspaceId: 1, contactId: 1 })
  QuotationSchema.index({ workspaceId: 1, dealId: 1 })
  QuotationSchema.index({ workspaceId: 1, validUntil: 1, status: 1 })
  QuotationSchema.index(
    { customerName: 'text', quotationNumber: 'text', subject: 'text' },
    { weights: { quotationNumber: 10, subject: 5, customerName: 3 } }
  )
}

export const Quotation =
  mongoose.models?.Quotation ||
  mongoose.model<IQuotation>('Quotation', QuotationSchema)
