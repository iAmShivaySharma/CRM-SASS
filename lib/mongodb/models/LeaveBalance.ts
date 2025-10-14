import mongoose from 'mongoose'

const leaveBalanceSchema = new mongoose.Schema({
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
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'bereavement', 'study'],
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0
  },
  usedDays: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingDays: {
    type: Number,
    default: 0,
    min: 0
  },
  carriedForwardDays: {
    type: Number,
    default: 0,
    min: 0
  },
  adjustments: [{
    type: {
      type: String,
      enum: ['addition', 'deduction'],
      required: true
    },
    days: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    adjustedDate: {
      type: Date,
      default: Date.now
    }
  }],
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
  collection: 'leave_balances'
})

// Compound indexes for efficient queries
leaveBalanceSchema.index({ workspaceId: 1, employeeId: 1, year: 1 })
leaveBalanceSchema.index({ workspaceId: 1, leaveType: 1, year: 1 })
leaveBalanceSchema.index({ employeeId: 1, leaveType: 1, year: 1 }, { unique: true })

// Update the updatedAt field on save
leaveBalanceSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Virtual for remaining days
leaveBalanceSchema.virtual('remainingDays').get(function() {
  return Math.max(0, this.totalDays + this.carriedForwardDays - this.usedDays - this.pendingDays)
})

// Virtual for available days (remaining - pending)
leaveBalanceSchema.virtual('availableDays').get(function() {
  return Math.max(0, this.totalDays + this.carriedForwardDays - this.usedDays)
})

// Virtual for utilization percentage
leaveBalanceSchema.virtual('utilizationPercentage').get(function() {
  const total = this.totalDays + this.carriedForwardDays
  if (total === 0) return 0
  return Math.round((this.usedDays / total) * 100)
})

// Instance methods
leaveBalanceSchema.methods.deductDays = function(days: number, reason: string) {
  if (this.availableDays < days) {
    throw new Error('Insufficient leave balance')
  }
  this.usedDays += days
  return this.save()
}

leaveBalanceSchema.methods.addPendingDays = function(days: number) {
  this.pendingDays += days
  return this.save()
}

leaveBalanceSchema.methods.removePendingDays = function(days: number) {
  this.pendingDays = Math.max(0, this.pendingDays - days)
  return this.save()
}

leaveBalanceSchema.methods.adjustBalance = function(days: number, type: 'addition' | 'deduction', reason: string, adjustedBy: string) {
  this.adjustments.push({
    type,
    days: Math.abs(days),
    reason,
    adjustedBy,
    adjustedDate: new Date()
  })

  if (type === 'addition') {
    this.totalDays += Math.abs(days)
  } else {
    this.totalDays = Math.max(0, this.totalDays - Math.abs(days))
  }

  return this.save()
}

// Static methods
leaveBalanceSchema.statics.getEmployeeBalance = function(employeeId: string, leaveType: string, year: number) {
  return this.findOne({ employeeId, leaveType, year })
}

leaveBalanceSchema.statics.initializeBalance = function(employeeId: string, leavePolicyId: string, leaveType: string, totalDays: number, year: number, workspaceId: string) {
  return this.create({
    workspaceId,
    employeeId,
    leavePolicyId,
    leaveType,
    year,
    totalDays,
    usedDays: 0,
    pendingDays: 0,
    carriedForwardDays: 0
  })
}

leaveBalanceSchema.statics.getWorkspaceBalances = function(workspaceId: string, year: number) {
  return this.find({ workspaceId, year })
    .populate('employeeId', 'name email')
    .populate('leavePolicyId', 'name type')
}

export const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema)