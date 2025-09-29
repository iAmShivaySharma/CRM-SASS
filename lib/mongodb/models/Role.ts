import mongoose, { Document, Schema } from 'mongoose'

export interface IRole extends Document {
  _id: string
  workspaceId: string
  name: string
  description?: string
  permissions: string[]
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

const RoleSchema = new Schema<IRole>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Indexes (only create on server side to prevent client-side errors)
if (typeof window === 'undefined') {
  RoleSchema.index({ workspaceId: 1, name: 1 }, { unique: true })
  RoleSchema.index({ isDefault: 1 })
}

export const Role =
  mongoose.models?.Role || mongoose.model<IRole>('Role', RoleSchema)
