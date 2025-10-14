import mongoose from 'mongoose'

const assetAllocationSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  allocatedDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  expectedReturnDate: {
    type: Date,
    index: true
  },
  actualReturnDate: {
    type: Date,
    index: true
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  allocationCondition: {
    type: String,
    required: true,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  returnCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor']
  },
  location: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'returned', 'overdue', 'lost', 'damaged'],
    default: 'active',
    index: true
  },
  agreementSigned: {
    type: Boolean,
    default: false
  },
  agreementDocument: {
    filename: String,
    url: String,
    signedDate: Date
  },
  accessories: [{
    name: String,
    serialNumber: String,
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    }
  }],
  maintenanceRecords: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['cleaning', 'repair', 'upgrade', 'inspection']
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cost: Number
  }],
  notes: {
    type: String,
    trim: true
  },
  returnNotes: {
    type: String,
    trim: true
  },
  images: [{
    type: {
      type: String,
      enum: ['allocation', 'return', 'damage', 'maintenance']
    },
    url: String,
    description: String,
    capturedDate: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    overdueSent: {
      type: Boolean,
      default: false
    },
    lastReminderDate: Date
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
  collection: 'asset_allocations'
})

// Compound indexes
assetAllocationSchema.index({ workspaceId: 1, employeeId: 1 })
assetAllocationSchema.index({ workspaceId: 1, status: 1 })
assetAllocationSchema.index({ workspaceId: 1, allocatedDate: 1 })
assetAllocationSchema.index({ assetId: 1, status: 1 })
assetAllocationSchema.index({ employeeId: 1, status: 1 })
assetAllocationSchema.index({ expectedReturnDate: 1, status: 1 })

// Update the updatedAt field on save
assetAllocationSchema.pre('save', function(next) {
  this.updatedAt = new Date()

  // Auto-update status based on dates
  if (this.actualReturnDate && this.status === 'active') {
    this.status = 'returned'
  } else if (this.expectedReturnDate && new Date() > this.expectedReturnDate && this.status === 'active') {
    this.status = 'overdue'
  }

  next()
})

// Virtual for allocation duration
assetAllocationSchema.virtual('allocationDuration').get(function() {
  const endDate = this.actualReturnDate || new Date()
  const diffTime = Math.abs(endDate.getTime() - this.allocatedDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// Virtual for days overdue
assetAllocationSchema.virtual('daysOverdue').get(function() {
  if (!this.expectedReturnDate || this.actualReturnDate) return 0
  const now = new Date()
  if (now <= this.expectedReturnDate) return 0
  return Math.ceil((now.getTime() - this.expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24))
})

// Virtual for is overdue
assetAllocationSchema.virtual('isOverdue').get(function() {
  return this.daysOverdue > 0
})

// Instance methods
assetAllocationSchema.methods.returnAsset = function(returnedBy: string, returnCondition: string, returnNotes?: string) {
  this.status = 'returned'
  this.actualReturnDate = new Date()
  this.returnedBy = returnedBy
  this.returnCondition = returnCondition
  if (returnNotes) this.returnNotes = returnNotes
  return this.save()
}

assetAllocationSchema.methods.markAsLost = function() {
  this.status = 'lost'
  return this.save()
}

assetAllocationSchema.methods.markAsDamaged = function() {
  this.status = 'damaged'
  return this.save()
}

assetAllocationSchema.methods.extendAllocation = function(newReturnDate: Date) {
  this.expectedReturnDate = newReturnDate
  this.status = 'active'
  return this.save()
}

assetAllocationSchema.methods.addMaintenanceRecord = function(record: any) {
  this.maintenanceRecords.push({
    ...record,
    date: new Date()
  })
  return this.save()
}

assetAllocationSchema.methods.signAgreement = function(filename: string, url: string) {
  this.agreementSigned = true
  this.agreementDocument = {
    filename,
    url,
    signedDate: new Date()
  }
  return this.save()
}

// Static methods
assetAllocationSchema.statics.getActiveAllocations = function(workspaceId: string) {
  return this.find({ workspaceId, status: 'active' })
    .populate('assetId', 'name brand model serialNumber')
    .populate('employeeId', 'name email')
    .sort({ allocatedDate: -1 })
}

assetAllocationSchema.statics.getOverdueAllocations = function(workspaceId: string) {
  return this.find({
    workspaceId,
    status: 'active',
    expectedReturnDate: { $lt: new Date() }
  })
    .populate('assetId', 'name brand model')
    .populate('employeeId', 'name email')
    .sort({ expectedReturnDate: 1 })
}

assetAllocationSchema.statics.getEmployeeAllocations = function(employeeId: string, status?: string) {
  const query: any = { employeeId }
  if (status) query.status = status

  return this.find(query)
    .populate('assetId', 'name brand model serialNumber category')
    .sort({ allocatedDate: -1 })
}

assetAllocationSchema.statics.getAssetHistory = function(assetId: string) {
  return this.find({ assetId })
    .populate('employeeId', 'name email')
    .populate('allocatedBy', 'name')
    .populate('returnedBy', 'name')
    .sort({ allocatedDate: -1 })
}

assetAllocationSchema.statics.getAllocationStats = function(workspaceId: string) {
  return this.aggregate([
    { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$assetValue' }
      }
    }
  ])
}

export const AssetAllocation = mongoose.models.AssetAllocation || mongoose.model('AssetAllocation', assetAllocationSchema)