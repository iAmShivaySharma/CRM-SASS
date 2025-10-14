import mongoose from 'mongoose'

const assetSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['laptop', 'desktop', 'monitor', 'phone', 'tablet', 'accessories', 'vehicle', 'furniture', 'equipment', 'software'],
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },
  assetTag: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  purchaseDate: {
    type: Date,
    required: true,
    index: true
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  vendor: {
    name: String,
    contact: String,
    email: String
  },
  condition: {
    type: String,
    required: true,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'excellent',
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'allocated', 'maintenance', 'retired', 'lost', 'damaged'],
    default: 'available',
    index: true
  },
  location: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  department: {
    type: String,
    trim: true,
    index: true
  },
  warranty: {
    provider: {
      type: String,
      trim: true
    },
    startDate: Date,
    expiryDate: Date,
    terms: String
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
  },
  images: [{
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['invoice', 'warranty', 'manual', 'certificate', 'other']
    },
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  depreciation: {
    method: {
      type: String,
      enum: ['straight_line', 'declining_balance', 'none'],
      default: 'straight_line'
    },
    usefulLife: {
      type: Number,
      min: 1 // years
    },
    salvageValue: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  insurance: {
    provider: String,
    policyNumber: String,
    coverage: Number,
    expiryDate: Date
  },
  qrCode: {
    type: String,
    sparse: true
  },
  notes: {
    type: String,
    trim: true
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
  collection: 'assets'
})

// Compound indexes
assetSchema.index({ workspaceId: 1, category: 1 })
assetSchema.index({ workspaceId: 1, status: 1 })
assetSchema.index({ workspaceId: 1, location: 1 })
assetSchema.index({ workspaceId: 1, department: 1 })
assetSchema.index({ brand: 1, model: 1 })

// Text index for search
assetSchema.index({
  name: 'text',
  brand: 'text',
  model: 'text',
  serialNumber: 'text',
  assetTag: 'text'
})

// Update the updatedAt field on save
assetSchema.pre('save', function(next) {
  this.updatedAt = new Date()

  // Generate asset tag if not provided
  if (!this.assetTag) {
    const categoryCode = this.category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    this.assetTag = `${categoryCode}-${timestamp}`
  }

  next()
})

// Virtual for current value (with depreciation)
assetSchema.virtual('currentValue').get(function() {
  if (!this.depreciation.usefulLife || this.depreciation.method === 'none') {
    return this.purchasePrice
  }

  const ageInYears = (Date.now() - this.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)

  if (this.depreciation.method === 'straight_line') {
    const annualDepreciation = (this.purchasePrice - this.depreciation.salvageValue) / this.depreciation.usefulLife
    const totalDepreciation = Math.min(annualDepreciation * ageInYears, this.purchasePrice - this.depreciation.salvageValue)
    return Math.max(this.purchasePrice - totalDepreciation, this.depreciation.salvageValue)
  }

  return this.purchasePrice
})

// Virtual for warranty status
assetSchema.virtual('warrantyStatus').get(function() {
  if (!this.warranty.expiryDate) return 'none'

  const now = new Date()
  if (this.warranty.expiryDate > now) {
    const daysUntilExpiry = Math.ceil((this.warranty.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry <= 30) return 'expiring_soon'
    return 'active'
  }
  return 'expired'
})

// Instance methods
assetSchema.methods.allocate = function() {
  this.status = 'allocated'
  return this.save()
}

assetSchema.methods.deallocate = function() {
  this.status = 'available'
  return this.save()
}

assetSchema.methods.sendForMaintenance = function() {
  this.status = 'maintenance'
  return this.save()
}

assetSchema.methods.retire = function() {
  this.status = 'retired'
  return this.save()
}

assetSchema.methods.updateCondition = function(newCondition: string) {
  this.condition = newCondition
  return this.save()
}

// Static methods
assetSchema.statics.getAvailableAssets = function(workspaceId: string, category?: string) {
  const query: any = { workspaceId, status: 'available' }
  if (category) query.category = category
  return this.find(query)
}

assetSchema.statics.getAssetsByLocation = function(workspaceId: string, location: string) {
  return this.find({ workspaceId, location })
}

assetSchema.statics.getWarrantyExpiring = function(workspaceId: string, days: number = 30) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  return this.find({
    workspaceId,
    'warranty.expiryDate': {
      $gte: new Date(),
      $lte: futureDate
    }
  })
}

assetSchema.statics.searchAssets = function(workspaceId: string, searchTerm: string) {
  return this.find({
    workspaceId,
    $text: { $search: searchTerm }
  }).sort({ score: { $meta: 'textScore' } })
}

export const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema)