import mongoose from 'mongoose'

const leavePolicySchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'bereavement', 'study'],
    index: true
  },
  daysPerYear: {
    type: Number,
    required: true,
    min: 0
  },
  carryForward: {
    type: Boolean,
    default: false
  },
  maxCarryForward: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  eligibility: {
    type: String,
    required: true,
    trim: true
  },
  minimumNotice: {
    type: Number,
    default: 1, // days
    min: 0
  },
  maxConsecutiveDays: {
    type: Number,
    default: null,
    min: 1
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  approvers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'leave_policies'
})

// Compound indexes
leavePolicySchema.index({ workspaceId: 1, type: 1 })
leavePolicySchema.index({ workspaceId: 1, isActive: 1 })

// Update the updatedAt field on save
leavePolicySchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Instance methods
leavePolicySchema.methods.isEligibleForEmployee = function(employee: any) {
  // Add business logic for eligibility checking
  return true
}

export const LeavePolicy = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema)