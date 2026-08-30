import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgCalibrationLog extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  equipmentName: string
  equipmentId?: string
  calibrationDate: Date
  nextDueDate: Date
  method: string
  result: 'pass' | 'fail' | 'adjusted'
  referenceStandard?: string
  deviationFound?: string
  correctionApplied?: string
  calibratedBy: string
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgCalibrationLogSchema = new Schema<IFmcgCalibrationLog>(
  {
    workspaceId: { type: String, required: true },
    equipmentName: { type: String, required: true, trim: true },
    equipmentId: { type: String, trim: true },
    calibrationDate: { type: Date, required: true },
    nextDueDate: { type: Date, required: true },
    method: { type: String, required: true, trim: true },
    result: {
      type: String,
      enum: ['pass', 'fail', 'adjusted'],
      required: true,
    },
    referenceStandard: { type: String, trim: true },
    deviationFound: { type: String, trim: true },
    correctionApplied: { type: String, trim: true },
    calibratedBy: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
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
  FmcgCalibrationLogSchema.index({ workspaceId: 1, calibrationDate: 1 })
  FmcgCalibrationLogSchema.index({ workspaceId: 1, equipmentName: 1 })
}

export const FmcgCalibrationLog =
  mongoose.models?.FmcgCalibrationLog ||
  mongoose.model<IFmcgCalibrationLog>(
    'FmcgCalibrationLog',
    FmcgCalibrationLogSchema
  )
