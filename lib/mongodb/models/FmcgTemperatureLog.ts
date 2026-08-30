import mongoose, { Document, Schema } from 'mongoose'

export interface IFmcgTemperatureLog extends Omit<Document, '_id'> {
  _id: string
  workspaceId: string
  date: Date
  location: string
  temperature: number
  humidity?: number
  loggedBy: string
  anomalyNoted: boolean
  anomalyDescription?: string
  actionTaken?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const FmcgTemperatureLogSchema = new Schema<IFmcgTemperatureLog>(
  {
    workspaceId: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number },
    loggedBy: { type: String, required: true, trim: true },
    anomalyNoted: { type: Boolean, default: false },
    anomalyDescription: { type: String, trim: true },
    actionTaken: { type: String, trim: true },
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
  FmcgTemperatureLogSchema.index({ workspaceId: 1, date: 1, location: 1 })
}

export const FmcgTemperatureLog =
  mongoose.models?.FmcgTemperatureLog ||
  mongoose.model<IFmcgTemperatureLog>(
    'FmcgTemperatureLog',
    FmcgTemperatureLogSchema
  )
