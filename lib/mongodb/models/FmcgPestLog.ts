import mongoose, { Document, Schema } from 'mongoose'

export interface IPestCheckEntry {
  area: string
  evidenceFound: boolean
  actionTaken?: string
}

export interface IFmcgPestLog extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  weekEnding: Date
  type: 'internal_check' | 'pco_visit'
  entries: IPestCheckEntry[]
  pcoName?: string
  pcoLicenseNumber?: string
  treatmentChemicals?: string
  checkedBy: string
  findings?: string
  reportUrl?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgPestLogSchema = new Schema<IFmcgPestLog>(
  {
    workspaceId: { type: String, required: true },
    weekEnding: { type: Date, required: true },
    type: {
      type: String,
      enum: ['internal_check', 'pco_visit'],
      required: true,
    },
    entries: [
      {
        area: { type: String, required: true, trim: true },
        evidenceFound: { type: Boolean, default: false },
        actionTaken: { type: String, trim: true },
      },
    ],
    pcoName: { type: String, trim: true },
    pcoLicenseNumber: { type: String, trim: true },
    treatmentChemicals: { type: String, trim: true },
    checkedBy: { type: String, required: true, trim: true },
    findings: { type: String, trim: true },
    reportUrl: { type: String, trim: true },
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
  FmcgPestLogSchema.index({ workspaceId: 1, weekEnding: 1 })
}

export const FmcgPestLog =
  mongoose.models?.FmcgPestLog ||
  mongoose.model<IFmcgPestLog>('FmcgPestLog', FmcgPestLogSchema)
