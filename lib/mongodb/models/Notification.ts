import mongoose, { Document, Schema } from 'mongoose'

export interface INotification extends Document {
  _id: string
  workspaceId: string
  userId: string // User who should receive this notification
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  entityType?: string // lead, contact, user, workspace, etc.
  entityId?: string // ID of the related entity
  actionUrl?: string // URL to navigate when clicked
  read: boolean
  readAt?: Date
  createdBy?: string // User who triggered the action
  activityId?: string // Reference to the activity that generated this notification
  notificationLevel: 'personal' | 'team' | 'workspace' // Scope of notification
  requiredPermissions?: string[] // Permissions needed to see this notification
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      required: true,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    entityType: {
      type: String,
      enum: [
        'lead',
        'contact',
        'user',
        'workspace',
        'role',
        'invitation',
        'webhook',
        'workflow_execution',
        'workflow_input',
      ],
    },
    entityId: {
      type: String,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    createdBy: {
      type: String,
      ref: 'User',
    },
    activityId: {
      type: String,
      ref: 'Activity',
    },
    notificationLevel: {
      type: String,
      enum: ['personal', 'team', 'workspace'],
      default: 'personal',
      index: true,
    },
    requiredPermissions: [
      {
        type: String,
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// Compound indexes for efficient querying and duplicate prevention
if (typeof window === 'undefined') {
  NotificationSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 })
  NotificationSchema.index({ workspaceId: 1, userId: 1, read: 1 })
  NotificationSchema.index({
    workspaceId: 1,
    notificationLevel: 1,
    createdAt: -1,
  })

  // Prevent duplicate notifications for same activity + user
  NotificationSchema.index(
    { workspaceId: 1, userId: 1, activityId: 1 },
    { unique: true, sparse: true }
  )

  // Prevent duplicate notifications for same entity + user + type within 1 hour
  NotificationSchema.index(
    {
      workspaceId: 1,
      userId: 1,
      entityType: 1,
      entityId: 1,
      type: 1,
      createdAt: 1,
    },
    {
      unique: true,
      sparse: true,
      partialFilterExpression: {
        entityType: { $exists: true },
        entityId: { $exists: true },
        createdAt: {
          $gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
        },
      },
    }
  )

  // Auto-delete after 30 days
  NotificationSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
  )
}

export const Notification =
  mongoose.models?.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)
