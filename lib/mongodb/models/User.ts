import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  _id: string
  email: string
  password: string
  fullName?: string
  avatarUrl?: string
  timezone: string
  preferences: Record<string, any>
  emailConfirmed: boolean
  emailConfirmedAt?: Date
  lastSignInAt?: Date
  lastActiveWorkspaceId?: string
  currentWorkspace?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    fullName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: {},
    },
    emailConfirmed: {
      type: Boolean,
      default: false,
    },
    emailConfirmedAt: {
      type: Date,
    },
    lastSignInAt: {
      type: Date,
    },
    lastActiveWorkspaceId: {
      type: String,
      ref: 'Workspace',
    },
    currentWorkspace: {
      type: String,
      ref: 'Workspace',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        delete ret.password // Never return password in JSON
        return ret
      },
    },
  }
)

// Optimized indexes for performance
if (typeof window === 'undefined') {
  UserSchema.index({ lastSignInAt: -1 }, { sparse: true })
}

export const User =
  mongoose.models?.User || mongoose.model<IUser>('User', UserSchema)
