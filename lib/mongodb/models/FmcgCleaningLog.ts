import mongoose, { Document, Schema } from 'mongoose'

export interface ICleaningEntry {
  area: string
  cleanedBy: string
  time: string
  sanitizerUsed?: string
  verified: boolean
}

export interface IFmcgCleaningLog extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  date: Date
  shift: 'morning' | 'afternoon' | 'evening' | 'full_day'
  entries: ICleaningEntry[]
  issuesNoted?: string
  supervisorName: string
  supervisorSignOff: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgCleaningLogSchema = new Schema<IFmcgCleaningLog>(
  {
    workspaceId: { type: String, required: true },
    date: { type: Date, required: true },
    shift: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'full_day'],
      required: true,
    },
    entries: [
      {
        area: { type: String, required: true, trim: true },
        cleanedBy: { type: String, required: true, trim: true },
        time: { type: String, required: true },
        sanitizerUsed: { type: String, trim: true },
        verified: { type: Boolean, default: false },
      },
    ],
    issuesNoted: { type: String, trim: true },
    supervisorName: { type: String, required: true, trim: true },
    supervisorSignOff: { type: Boolean, default: false },
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
  FmcgCleaningLogSchema.index({ workspaceId: 1, date: 1 })
}

export const FmcgCleaningLog =
  mongoose.models?.FmcgCleaningLog ||
  mongoose.model<IFmcgCleaningLog>('FmcgCleaningLog', FmcgCleaningLogSchema)
