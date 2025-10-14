import mongoose from 'mongoose'

const leaveRequestSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leavePolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeavePolicy',
    required: true
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'bereavement', 'study']
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0.5 // Allow half days
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  appliedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  comments: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  handoverDetails: {
    handoverTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tasks: String,
    notes: String
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
  collection: 'leave_requests'
})

// Compound indexes
leaveRequestSchema.index({ workspaceId: 1, employeeId: 1 })
leaveRequestSchema.index({ workspaceId: 1, status: 1 })
leaveRequestSchema.index({ workspaceId: 1, startDate: 1, endDate: 1 })
leaveRequestSchema.index({ employeeId: 1, status: 1, startDate: 1 })

// Update the updatedAt field on save
leaveRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Virtual for calculating duration
leaveRequestSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }
  return 0
})

// Instance methods
leaveRequestSchema.methods.approve = function(approvedBy: string, comments?: string) {
  this.status = 'approved'
  this.approvedBy = approvedBy
  this.approvedDate = new Date()
  if (comments) this.comments = comments
  return this.save()
}

leaveRequestSchema.methods.reject = function(approvedBy: string, rejectionReason: string) {
  this.status = 'rejected'
  this.approvedBy = approvedBy
  this.approvedDate = new Date()
  this.rejectionReason = rejectionReason
  return this.save()
}

leaveRequestSchema.methods.cancel = function() {
  this.status = 'cancelled'
  return this.save()
}

// Static methods
leaveRequestSchema.statics.getOverlappingRequests = function(employeeId: string, startDate: Date, endDate: Date) {
  return this.find({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  })
}

export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema)