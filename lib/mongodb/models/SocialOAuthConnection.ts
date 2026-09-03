import mongoose, { type Document, Schema } from 'mongoose'

export interface ISocialOAuthConnection extends Document {
  workspaceId: string
  userId: string
  provider: 'linkedin' | 'meta'
  providerAccountId: string
  displayName: string
  email?: string
  profilePicture?: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  scopes: string[]
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const SocialOAuthConnectionSchema = new Schema<ISocialOAuthConnection>(
  {
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    provider: { type: String, enum: ['linkedin', 'meta'], required: true },
    providerAccountId: { type: String, required: true },
    displayName: { type: String, required: true },
    email: { type: String },
    profilePicture: { type: String },
    accessToken: { type: String, required: true, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    scopes: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

SocialOAuthConnectionSchema.index(
  { workspaceId: 1, provider: 1, providerAccountId: 1 },
  { unique: true }
)

export const SocialOAuthConnection =
  mongoose.models.SocialOAuthConnection ||
  mongoose.model<ISocialOAuthConnection>(
    'SocialOAuthConnection',
    SocialOAuthConnectionSchema
  )
