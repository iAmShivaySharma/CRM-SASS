import mongoose, { Document, Schema } from 'mongoose'

export interface IPermission extends Document {
  _id: string
  workspaceId?: string // null means system-wide permission
  name: string // e.g., 'leads.create', 'users.delete'
  displayName: string // e.g., 'Create Leads', 'Delete Users'
  description?: string
  resource: string // e.g., 'leads', 'users', 'roles'
  action: string // e.g., 'create', 'read', 'update', 'delete', 'manage'
  category: string // e.g., 'Core', 'Sales', 'Admin', 'Analytics'
  isSystemPermission: boolean // true for built-in permissions
  isActive: boolean
  dependencies?: string[] // permissions that must be granted for this to work
  conflictsWith?: string[] // permissions that cannot coexist with this one
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const PermissionSchema = new Schema<IPermission>(
  {
    workspaceId: {
      type: String,
      ref: 'Workspace',
      default: null, // null means system-wide
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      // Format: resource.action (e.g., 'leads.create', 'users.delete')
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      lowercase: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Core', 'Sales', 'Admin', 'Analytics', 'Integration', 'Custom'],
      default: 'Custom',
    },
    isSystemPermission: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dependencies: [
      {
        type: String,
        trim: true,
      },
    ],
    conflictsWith: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: String,
      ref: 'User',
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

// Indexes
if (typeof window === 'undefined') {
  // Compound index for workspace + name uniqueness
  PermissionSchema.index({ workspaceId: 1, name: 1 }, { unique: true })

  // Index for efficient filtering
  PermissionSchema.index({ resource: 1, action: 1 })
  PermissionSchema.index({ category: 1, isActive: 1 })
  PermissionSchema.index({ isSystemPermission: 1, isActive: 1 })
  PermissionSchema.index({ workspaceId: 1, isActive: 1 })
}

// Pre-save middleware to generate name from resource.action
PermissionSchema.pre('save', function (next) {
  if (this.isModified('resource') || this.isModified('action')) {
    this.name = `${this.resource}.${this.action}`
  }
  next()
})

// Static method to get system permissions
PermissionSchema.statics.getSystemPermissions = function () {
  return this.find({ isSystemPermission: true, isActive: true }).lean()
}

// Static method to get workspace permissions
PermissionSchema.statics.getWorkspacePermissions = function (workspaceId: string) {
  return this.find({
    $or: [
      { workspaceId: workspaceId, isActive: true },
      { isSystemPermission: true, isActive: true }
    ]
  }).lean()
}

export const Permission =
  mongoose.models?.Permission || mongoose.model<IPermission>('Permission', PermissionSchema)