import mongoose, { Document, Schema } from 'mongoose'

export interface ITestParameter {
  name: string
  value: string
  unit: string
  minLimit: string
  maxLimit: string
  status: 'pass' | 'fail'
}

export interface IFmcgTestReport extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  batchId: string
  productId: string
  reportNumber: string
  testType:
    | 'microbiological'
    | 'chemical'
    | 'physical'
    | 'sensory'
    | 'nutritional'
    | 'pesticide'
    | 'heavy_metals'
    | 'other'
  labName: string
  labAccreditationNumber?: string
  sampleCollectedAt: Date
  reportDate: Date
  result: 'pass' | 'fail' | 'conditional_pass'
  parameters: ITestParameter[]
  overallObservations?: string
  reportUrl?: string
  certificateNumber?: string
  validUntil?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const TestParameterSchema = new Schema<ITestParameter>(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    minLimit: { type: String, trim: true },
    maxLimit: { type: String, trim: true },
    status: { type: String, enum: ['pass', 'fail'], required: true },
  },
  { _id: false }
)

const FmcgTestReportSchema = new Schema<IFmcgTestReport>(
  {
    workspaceId: { type: String, required: true },
    batchId: { type: String, ref: 'FmcgBatch', required: true },
    productId: { type: String, ref: 'FmcgProduct', required: true },
    reportNumber: { type: String, required: true, trim: true },
    testType: {
      type: String,
      enum: [
        'microbiological',
        'chemical',
        'physical',
        'sensory',
        'nutritional',
        'pesticide',
        'heavy_metals',
        'other',
      ],
      required: true,
    },
    labName: { type: String, required: true, trim: true },
    labAccreditationNumber: { type: String, trim: true },
    sampleCollectedAt: { type: Date, required: true },
    reportDate: { type: Date, required: true },
    result: {
      type: String,
      enum: ['pass', 'fail', 'conditional_pass'],
      required: true,
    },
    parameters: { type: [TestParameterSchema], default: [] },
    overallObservations: { type: String, trim: true, maxlength: 2000 },
    reportUrl: { type: String, trim: true },
    certificateNumber: { type: String, trim: true },
    validUntil: { type: Date },
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
  FmcgTestReportSchema.index({ workspaceId: 1, batchId: 1 })
  FmcgTestReportSchema.index(
    { workspaceId: 1, reportNumber: 1 },
    { unique: true }
  )
}

export const FmcgTestReport =
  mongoose.models?.FmcgTestReport ||
  mongoose.model<IFmcgTestReport>('FmcgTestReport', FmcgTestReportSchema)
