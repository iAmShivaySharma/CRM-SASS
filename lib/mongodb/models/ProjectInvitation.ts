import mongoose, { Document, Schema } from 'mongoose'

export interface IProjectInvitation extends Document {
  _id: string
  projectId: string
  inviteeEmail: string
  inviteeId?: string // If user exists in system
  inviterId: string
  roleId: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  token: string
  expiresAt: Date
  message?: string
  acceptedAt?: Date
  declinedAt?: Date
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

export interface IProjectJoinRequest extends Document {
  _id: string
  projectId: string
  userId: string
  requesterId: string
  status: 'pending' | 'approved' | 'denied'
  message?: string
  approvedBy?: string
  approvedAt?: Date
  deniedBy?: string
  deniedAt?: Date
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

const ProjectInvitationSchema = new Schema<IProjectInvitation>(
  {
    projectId: {
      type: String,
      ref: 'Project',
      required: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    inviteeId: {
      type: String,
      ref: 'User',
    },
    inviterId: {
      type: String,
      ref: 'User',
      required: true,
    },
    roleId: {
      type: String,
      ref: 'Role',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    acceptedAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        delete ret.token // Don't expose token in JSON
        return ret
      },
    },
  }
)

const ProjectJoinRequestSchema = new Schema<IProjectJoinRequest>(
  {
    projectId: {
      type: String,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    requesterId: {
      type: String,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    approvedBy: {
      type: String,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    deniedBy: {
      type: String,
      ref: 'User',
    },
    deniedAt: {
      type: Date,
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
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

// Optimized indexes for performance
if (typeof window === 'undefined') {
  ProjectInvitationSchema.index(
    { projectId: 1, inviteeEmail: 1 },
    { unique: true }
  )
  ProjectInvitationSchema.index({ token: 1 }, { unique: true })
  ProjectInvitationSchema.index({ status: 1, expiresAt: 1 })
  ProjectInvitationSchema.index({ inviterId: 1 })

  ProjectJoinRequestSchema.index({ projectId: 1, userId: 1 }, { unique: true })
  ProjectJoinRequestSchema.index({ userId: 1, status: 1 })
  ProjectJoinRequestSchema.index({ projectId: 1, status: 1 })
}

export const ProjectInvitation =
  mongoose.models?.ProjectInvitation ||
  mongoose.model<IProjectInvitation>(
    'ProjectInvitation',
    ProjectInvitationSchema
  )

export const ProjectJoinRequest =
  mongoose.models?.ProjectJoinRequest ||
  mongoose.model<IProjectJoinRequest>(
    'ProjectJoinRequest',
    ProjectJoinRequestSchema
  )
