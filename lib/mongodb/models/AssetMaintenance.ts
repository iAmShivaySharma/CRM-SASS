import mongoose from 'mongoose'

const assetMaintenanceSchema = new mongoose.Schema({
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
  maintenanceId: {
    type: String,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['repair', 'upgrade', 'inspection', 'cleaning', 'replacement', 'calibration', 'software_update'],
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    index: true
  },
  completedDate: {
    type: Date,
    index: true
  },
  estimatedDuration: {
    type: Number, // in hours
    min: 0
  },
  actualDuration: {
    type: Number, // in hours
    min: 0
  },
  estimatedCost: {
    type: Number,
    min: 0,
    default: 0
  },
  actualCost: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'failed'],
    default: 'scheduled',
    index: true
  },
  vendor: {
    name: {
      type: String,
      trim: true
    },
    contact: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  internalTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  partsRequired: [{
    name: {
      type: String,
      required: true
    },
    partNumber: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      min: 0
    },
    supplier: String,
    status: {
      type: String,
      enum: ['required', 'ordered', 'received', 'installed'],
      default: 'required'
    }
  }],
  workOrder: {
    number: String,
    instructions: String,
    safetyNotes: String
  },
  beforeCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    index: true
  },
  afterCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor']
  },
  workPerformed: {
    type: String,
    trim: true
  },
  issuesFound: [{
    description: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'critical']
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  followUpRequired: {
    type: Boolean,
    default: false
  },
  nextMaintenanceDate: {
    type: Date,
    index: true
  },
  documents: [{
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'warranty', 'report', 'certificate', 'photo', 'other']
    },
    filename: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  images: [{
    type: {
      type: String,
      enum: ['before', 'during', 'after', 'damage', 'repair']
    },
    url: String,
    description: String,
    capturedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
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
  collection: 'asset_maintenance'
})

// Compound indexes
assetMaintenanceSchema.index({ workspaceId: 1, status: 1 })
assetMaintenanceSchema.index({ workspaceId: 1, scheduledDate: 1 })
assetMaintenanceSchema.index({ workspaceId: 1, type: 1 })
assetMaintenanceSchema.index({ assetId: 1, status: 1 })
assetMaintenanceSchema.index({ createdBy: 1, status: 1 })
assetMaintenanceSchema.index({ 'vendor.name': 1 })

// Generate maintenance ID before saving
assetMaintenanceSchema.pre('save', function(next) {
  this.updatedAt = new Date()

  if (!this.maintenanceId) {
    const prefix = 'MNT'
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    this.maintenanceId = `${prefix}-${timestamp}-${random}`
  }

  // Auto-update status based on dates
  if (this.completedDate && this.status !== 'completed' && this.status !== 'failed') {
    this.status = 'completed'
  } else if (this.startDate && !this.completedDate && this.status === 'scheduled') {
    this.status = 'in_progress'
  }

  next()
})

// Virtual for maintenance duration
assetMaintenanceSchema.virtual('duration').get(function() {
  if (this.startDate && this.completedDate) {
    return Math.abs(this.completedDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60) // hours
  }
  return null
})

// Virtual for is overdue
assetMaintenanceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return false
  return new Date() > this.scheduledDate
})

// Virtual for days overdue
assetMaintenanceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0
  return Math.ceil((new Date().getTime() - this.scheduledDate.getTime()) / (1000 * 60 * 60 * 24))
})

// Virtual for total parts cost
assetMaintenanceSchema.virtual('totalPartsCost').get(function() {
  return this.partsRequired.reduce((total, part) => {
    return total + ((part.unitCost || 0) * part.quantity)
  }, 0)
})

// Instance methods
assetMaintenanceSchema.methods.start = function(technicianId?: string) {
  this.status = 'in_progress'
  this.startDate = new Date()
  if (technicianId) this.internalTechnician = technicianId
  return this.save()
}

assetMaintenanceSchema.methods.complete = function(workPerformed: string, afterCondition: string, actualCost?: number) {
  this.status = 'completed'
  this.completedDate = new Date()
  this.workPerformed = workPerformed
  this.afterCondition = afterCondition
  if (actualCost !== undefined) this.actualCost = actualCost

  // Calculate actual duration
  if (this.startDate) {
    this.actualDuration = (this.completedDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60)
  }

  return this.save()
}

assetMaintenanceSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled'
  if (reason) {
    this.workPerformed = `Cancelled: ${reason}`
  }
  return this.save()
}

assetMaintenanceSchema.methods.fail = function(reason: string) {
  this.status = 'failed'
  this.completedDate = new Date()
  this.workPerformed = `Failed: ${reason}`
  return this.save()
}

assetMaintenanceSchema.methods.addPart = function(part: any) {
  this.partsRequired.push(part)
  return this.save()
}

assetMaintenanceSchema.methods.updatePartStatus = function(partIndex: number, status: string) {
  if (this.partsRequired[partIndex]) {
    this.partsRequired[partIndex].status = status
  }
  return this.save()
}

assetMaintenanceSchema.methods.approve = function(approvedBy: string) {
  this.approvedBy = approvedBy
  this.approvedAt = new Date()
  return this.save()
}

// Static methods
assetMaintenanceSchema.statics.getScheduledMaintenance = function(workspaceId: string, days: number = 30) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  return this.find({
    workspaceId,
    status: 'scheduled',
    scheduledDate: { $lte: futureDate }
  })
    .populate('assetId', 'name brand model serialNumber')
    .sort({ scheduledDate: 1 })
}

assetMaintenanceSchema.statics.getOverdueMaintenance = function(workspaceId: string) {
  return this.find({
    workspaceId,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledDate: { $lt: new Date() }
  })
    .populate('assetId', 'name brand model')
    .sort({ scheduledDate: 1 })
}

assetMaintenanceSchema.statics.getAssetMaintenanceHistory = function(assetId: string) {
  return this.find({ assetId })
    .populate('createdBy', 'name')
    .populate('internalTechnician', 'name')
    .sort({ scheduledDate: -1 })
}

assetMaintenanceSchema.statics.getMaintenanceStats = function(workspaceId: string, startDate?: Date, endDate?: Date) {
  const matchQuery: any = { workspaceId }

  if (startDate || endDate) {
    matchQuery.scheduledDate = {}
    if (startDate) matchQuery.scheduledDate.$gte = startDate
    if (endDate) matchQuery.scheduledDate.$lte = endDate
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$actualCost' },
        avgDuration: { $avg: '$actualDuration' }
      }
    }
  ])
}

export const AssetMaintenance = mongoose.models.AssetMaintenance || mongoose.model('AssetMaintenance', assetMaintenanceSchema)