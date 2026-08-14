import mongoose, { Document, Schema } from 'mongoose'

export interface IInvoiceItem {
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

export interface IInvoice extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  invoiceNumber: string
  type: 'tax_invoice' | 'proforma' | 'credit_note' | 'debit_note'
  status:
    | 'draft'
    | 'sent'
    | 'viewed'
    | 'paid'
    | 'partially_paid'
    | 'overdue'
    | 'cancelled'

  // Customer
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

  // Seller
  sellerName?: string
  sellerGstin?: string
  sellerAddress?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }

  // Dates
  invoiceDate: Date
  dueDate?: Date
  paidDate?: Date

  // Items
  items: IInvoiceItem[]

  // Amounts
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  roundOff: number
  grandTotal: number
  amountPaid: number
  amountDue: number
  currency: string

  // GST
  placeOfSupply: string
  isInterState: boolean
  reverseCharge: boolean
  eWayBillNumber?: string

  // Payment
  paymentTerms?: string
  bankDetails?: {
    bankName?: string
    accountNumber?: string
    ifscCode?: string
    upiId?: string
  }

  // References
  dealId?: string
  quoteId?: string
  referenceNumber?: string

  // Notes
  notes?: string
  termsAndConditions?: string
  internalNotes?: string

  // Recurring
  isRecurring: boolean
  recurringInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  nextRecurringDate?: Date
  parentInvoiceId?: string

  // Metadata
  pdfUrl?: string
  sentAt?: Date
  viewedAt?: Date
  reminders: Array<{
    sentAt: Date
    channel: 'email' | 'whatsapp' | 'sms'
  }>

  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const InvoiceItemSchema = new Schema(
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

const BankDetailsSchema = new Schema(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    upiId: { type: String, trim: true },
  },
  { _id: false }
)

const ReminderSchema = new Schema(
  {
    sentAt: { type: Date, required: true },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'sms'],
      required: true,
    },
  },
  { _id: false }
)

const InvoiceSchema = new Schema<IInvoice>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    type: {
      type: String,
      enum: ['tax_invoice', 'proforma', 'credit_note', 'debit_note'],
      default: 'tax_invoice',
    },
    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'viewed',
        'paid',
        'partially_paid',
        'overdue',
        'cancelled',
      ],
      default: 'draft',
    },

    // Customer
    contactId: { type: String, ref: 'Contact' },
    customerName: { type: String, required: true, trim: true, maxlength: 200 },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true },
    customerGstin: { type: String, trim: true, maxlength: 15 },
    customerAddress: AddressSchema,

    // Seller
    sellerName: { type: String, trim: true },
    sellerGstin: { type: String, trim: true, maxlength: 15 },
    sellerAddress: AddressSchema,

    // Dates
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    paidDate: { type: Date },

    // Items
    items: [InvoiceItemSchema],

    // Amounts
    subtotal: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, default: 0, min: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountDue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', trim: true, maxlength: 5 },

    // GST
    placeOfSupply: { type: String, trim: true, maxlength: 50 },
    isInterState: { type: Boolean, default: false },
    reverseCharge: { type: Boolean, default: false },
    eWayBillNumber: { type: String, trim: true },

    // Payment
    paymentTerms: { type: String, trim: true, maxlength: 500 },
    bankDetails: BankDetailsSchema,

    // References
    dealId: { type: String, ref: 'Deal' },
    quoteId: { type: String },
    referenceNumber: { type: String, trim: true },

    // Notes
    notes: { type: String, trim: true, maxlength: 2000 },
    termsAndConditions: { type: String, trim: true, maxlength: 5000 },
    internalNotes: { type: String, trim: true, maxlength: 1000 },

    // Recurring
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    },
    nextRecurringDate: { type: Date },
    parentInvoiceId: { type: String, ref: 'Invoice' },

    // Metadata
    pdfUrl: { type: String },
    sentAt: { type: Date },
    viewedAt: { type: Date },
    reminders: [ReminderSchema],

    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
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
  InvoiceSchema.index({ workspaceId: 1, status: 1, createdAt: -1 })
  InvoiceSchema.index({ workspaceId: 1, invoiceNumber: 1 }, { unique: true })
  InvoiceSchema.index({ workspaceId: 1, contactId: 1 })
  InvoiceSchema.index({ workspaceId: 1, dueDate: 1, status: 1 })
  InvoiceSchema.index({ workspaceId: 1, type: 1 })
  InvoiceSchema.index({ workspaceId: 1, dealId: 1 })
  InvoiceSchema.index({ isRecurring: 1, nextRecurringDate: 1 })
  InvoiceSchema.index(
    { customerName: 'text', invoiceNumber: 'text', customerEmail: 'text' },
    { weights: { invoiceNumber: 10, customerName: 5, customerEmail: 1 } }
  )
}

export const Invoice =
  mongoose.models?.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema)
