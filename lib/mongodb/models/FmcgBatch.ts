import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgBatch extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  productId: string
  batchNumber: string
  manufacturingDate: Date
  expiryDate: Date
  bestBeforeDate?: Date
  quantityProduced: number
  quantityUnit: string
  quantityRemaining?: number
  lineNumber?: string
  plantCode?: string
  qcStatus: 'pending' | 'passed' | 'failed' | 'hold'
  qcNotes?: string
  qcApprovedBy?: string
  qcApprovedAt?: Date
  rawMaterialDetails?: string
  supplierId?: string
  supplierName?: string
  supplierLotNumber?: string
  supplierFssaiNumber?: string
  purchaseOrderNumber?: string
  inwardDate?: Date
  inwardQuantity?: number
  inwardQuantityUnit?: string
  inwardInspectionStatus?: 'pending' | 'accepted' | 'rejected' | 'partial'
  inwardInspectionNotes?: string
  packagingMaterial?: string
  storageLocation?: string
  temperature?: number
  humidity?: number
  dispatchDetails?: string
  recallStatus: 'none' | 'partial' | 'full'
  recallReason?: string
  recallDate?: Date
  status: 'active' | 'consumed' | 'recalled' | 'expired' | 'destroyed'
  dryingStartTime?: Date
  dryingEndTime?: Date
  dryingTargetTemp?: number
  dryingLog?: Array<{ time: Date; temperature: number; notes?: string }>
  ccp1Passed?: boolean
  ccp1Action?: string
  moistureSample1?: number
  moistureSample2?: number
  moistureSample3?: number
  moistureAverage?: number
  moistureLimit?: number
  ccp2Passed?: boolean
  ccp2Action?: string
  sealCheckFirst3?: 'pass' | 'fail'
  sealCheckLast3?: 'pass' | 'fail'
  sealCheckMid?: 'pass' | 'fail'
  ccp3Passed?: boolean
  ccp3Action?: string
  packsProduced?: number
  packSize?: string
  labelCheckVerified?: boolean
  labelCheckBy?: string
  finalDisposition?: 'released' | 'quarantined' | 'rejected'
  dispositionReason?: string
  rmLots?: Array<{
    rmLotNumber: string
    materialName: string
    quantityUsed: number
    unit: string
  }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgBatchSchema = new Schema<IFmcgBatch>(
  {
    workspaceId: { type: String, required: true },
    productId: { type: String, ref: 'FmcgProduct', required: true },
    batchNumber: { type: String, required: true, trim: true },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    bestBeforeDate: { type: Date },
    quantityProduced: { type: Number, required: true },
    quantityUnit: { type: String, default: 'units', trim: true },
    quantityRemaining: { type: Number },
    lineNumber: { type: String, trim: true },
    plantCode: { type: String, trim: true },
    qcStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'hold'],
      default: 'pending',
    },
    qcNotes: { type: String, trim: true },
    qcApprovedBy: { type: String },
    qcApprovedAt: { type: Date },
    rawMaterialDetails: { type: String, trim: true, maxlength: 2000 },
    supplierId: { type: String, ref: 'FmcgSupplier' },
    supplierName: { type: String, trim: true },
    supplierLotNumber: { type: String, trim: true },
    supplierFssaiNumber: { type: String, trim: true },
    purchaseOrderNumber: { type: String, trim: true },
    inwardDate: { type: Date },
    inwardQuantity: { type: Number },
    inwardQuantityUnit: { type: String, trim: true, default: 'units' },
    inwardInspectionStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'partial'],
    },
    inwardInspectionNotes: { type: String, trim: true, maxlength: 1000 },
    packagingMaterial: { type: String, trim: true },
    storageLocation: { type: String, trim: true },
    temperature: { type: Number },
    humidity: { type: Number },
    dispatchDetails: { type: String, trim: true, maxlength: 2000 },
    recallStatus: {
      type: String,
      enum: ['none', 'partial', 'full'],
      default: 'none',
    },
    recallReason: { type: String, trim: true },
    recallDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'consumed', 'recalled', 'expired', 'destroyed'],
      default: 'active',
    },
    dryingStartTime: { type: Date },
    dryingEndTime: { type: Date },
    dryingTargetTemp: { type: Number },
    dryingLog: [{ time: Date, temperature: Number, notes: String }],
    ccp1Passed: { type: Boolean },
    ccp1Action: { type: String, trim: true },
    moistureSample1: { type: Number },
    moistureSample2: { type: Number },
    moistureSample3: { type: Number },
    moistureAverage: { type: Number },
    moistureLimit: { type: Number },
    ccp2Passed: { type: Boolean },
    ccp2Action: { type: String, trim: true },
    sealCheckFirst3: { type: String, enum: ['pass', 'fail'] },
    sealCheckLast3: { type: String, enum: ['pass', 'fail'] },
    sealCheckMid: { type: String, enum: ['pass', 'fail'] },
    ccp3Passed: { type: Boolean },
    ccp3Action: { type: String, trim: true },
    packsProduced: { type: Number },
    packSize: { type: String, trim: true },
    labelCheckVerified: { type: Boolean },
    labelCheckBy: { type: String, trim: true },
    finalDisposition: {
      type: String,
      enum: ['released', 'quarantined', 'rejected'],
    },
    dispositionReason: { type: String, trim: true },
    rmLots: [
      {
        rmLotNumber: String,
        materialName: String,
        quantityUsed: Number,
        unit: String,
      },
    ],
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
  FmcgBatchSchema.index({ workspaceId: 1, batchNumber: 1 }, { unique: true })
  FmcgBatchSchema.index({ workspaceId: 1, productId: 1 })
  FmcgBatchSchema.index({ workspaceId: 1, expiryDate: 1 })
}

export const FmcgBatch =
  mongoose.models?.FmcgBatch ||
  mongoose.model<IFmcgBatch>('FmcgBatch', FmcgBatchSchema)
