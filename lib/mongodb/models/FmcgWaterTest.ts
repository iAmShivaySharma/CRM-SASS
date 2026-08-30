import mongoose, { Document, Schema } from 'mongoose'

export interface IWaterTestParameter {
  name: string
  value: string
  unit?: string
  limit?: string
  status: 'pass' | 'fail'
}

export interface IFmcgWaterTest extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  testDate: Date
  labName: string
  labAccreditationNumber?: string
  sampleSource: string
  parameters: IWaterTestParameter[]
  overallResult: 'pass' | 'fail'
  validUntil: Date
  reportUrl?: string
  remarks?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgWaterTestSchema = new Schema<IFmcgWaterTest>(
  {
    workspaceId: { type: String, required: true },
    testDate: { type: Date, required: true },
    labName: { type: String, required: true, trim: true },
    labAccreditationNumber: { type: String, trim: true },
    sampleSource: { type: String, required: true, trim: true },
    parameters: [
      {
        name: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
        unit: { type: String, trim: true },
        limit: { type: String, trim: true },
        status: { type: String, enum: ['pass', 'fail'], required: true },
      },
    ],
    overallResult: {
      type: String,
      enum: ['pass', 'fail'],
      required: true,
    },
    validUntil: { type: Date, required: true },
    reportUrl: { type: String, trim: true },
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
  FmcgWaterTestSchema.index({ workspaceId: 1, testDate: 1 })
}

export const FmcgWaterTest =
  mongoose.models?.FmcgWaterTest ||
  mongoose.model<IFmcgWaterTest>('FmcgWaterTest', FmcgWaterTestSchema)
