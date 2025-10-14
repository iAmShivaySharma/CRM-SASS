import mongoose, { Schema, Document } from 'mongoose'

export interface IShift extends Document {
  name: string
  workspaceId: mongoose.Types.ObjectId
  startTime: string // "09:00"
  endTime: string // "17:00"
  breakDuration: number // in minutes
  workingDays: number[] // [1,2,3,4,5] (Monday to Friday)
  totalHours: number
  isFlexible: boolean
  graceTime: number // Grace period in minutes for late arrival
  isDefault: boolean
  isActive: boolean
  timezone: string
  createdBy: mongoose.Types.ObjectId
  description?: string
  color: string // For calendar/UI display
  allowedWorkTypes: string[] // ['office', 'remote', 'hybrid']
  overtimeRules: {
    allowOvertime: boolean
    maxOvertimeHours: number
    overtimeMultiplier: number // e.g., 1.5 for time and a half
  }
  createdAt: Date
  updatedAt: Date

  // Instance methods
  isWorkingDay(date: Date): boolean
  getShiftDuration(): number
  isWithinGracePeriod(arrivalTime: Date, shiftDate: Date): boolean
}

const ShiftSchema = new Schema<IShift>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'End time must be in HH:MM format'
      }
    },
    breakDuration: {
      type: Number,
      default: 60, // 1 hour default
      min: 0,
      max: 480 // 8 hours max
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Monday to Friday
      validate: {
        validator: function(days: number[]) {
          return days.every(day => day >= 0 && day <= 6)
        },
        message: 'Working days must be numbers between 0 (Sunday) and 6 (Saturday)'
      }
    },
    totalHours: {
      type: Number,
      required: true,
      min: 1,
      max: 24
    },
    isFlexible: {
      type: Boolean,
      default: false
    },
    graceTime: {
      type: Number,
      default: 15, // 15 minutes grace period
      min: 0,
      max: 120
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    color: {
      type: String,
      default: '#3B82F6', // Blue
      validate: {
        validator: function(v: string) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v)
        },
        message: 'Color must be a valid hex color code'
      }
    },
    allowedWorkTypes: {
      type: [String],
      enum: ['office', 'remote', 'hybrid', 'field'],
      default: ['office', 'remote']
    },
    overtimeRules: {
      allowOvertime: {
        type: Boolean,
        default: true
      },
      maxOvertimeHours: {
        type: Number,
        default: 4,
        min: 0,
        max: 12
      },
      overtimeMultiplier: {
        type: Number,
        default: 1.5,
        min: 1,
        max: 3
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Compound indexes
ShiftSchema.index({ workspaceId: 1, isActive: 1 })
ShiftSchema.index({ workspaceId: 1, isDefault: 1 })

// Virtual for shift duration display
ShiftSchema.virtual('durationDisplay').get(function() {
  const hours = Math.floor(this.totalHours)
  const minutes = Math.round((this.totalHours - hours) * 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
})

// Virtual for time range display
ShiftSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`
})

// Instance method to check if a date is a working day
ShiftSchema.methods.isWorkingDay = function(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return this.workingDays.includes(dayOfWeek)
}

// Instance method to get shift duration in minutes
ShiftSchema.methods.getShiftDuration = function(): number {
  const [startHour, startMinute] = this.startTime.split(':').map(Number)
  const [endHour, endMinute] = this.endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMinute
  let endMinutes = endHour * 60 + endMinute

  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  return endMinutes - startMinutes - this.breakDuration
}

// Instance method to check if arrival is within grace period
ShiftSchema.methods.isWithinGracePeriod = function(arrivalTime: Date, shiftDate: Date): boolean {
  const [startHour, startMinute] = this.startTime.split(':').map(Number)
  const shiftStart = new Date(shiftDate)
  shiftStart.setHours(startHour, startMinute, 0, 0)

  const graceEndTime = new Date(shiftStart.getTime() + this.graceTime * 60 * 1000)
  return arrivalTime <= graceEndTime
}

// Static method to get default shift for workspace
ShiftSchema.statics.getDefaultShift = function(workspaceId: string) {
  return this.findOne({
    workspaceId,
    isDefault: true,
    isActive: true
  })
}

// Static method to get user's shift for a specific date
ShiftSchema.statics.getUserShift = function(userId: string, workspaceId: string, date: Date) {
  // First try to find user-specific shift assignment
  // If not found, return default shift
  return this.findOne({
    workspaceId,
    isDefault: true,
    isActive: true
  })
}

// Pre-save middleware
ShiftSchema.pre('save', function(next) {
  // Calculate total hours from start and end time
  const duration = this.getShiftDuration()
  this.totalHours = Math.round((duration / 60) * 100) / 100 // Round to 2 decimal places

  // Ensure only one default shift per workspace
  if (this.isDefault && this.isModified('isDefault')) {
    this.constructor.updateMany(
      {
        workspaceId: this.workspaceId,
        _id: { $ne: this._id }
      },
      { isDefault: false }
    ).exec()
  }

  next()
})

export default mongoose.models.Shift ||
  mongoose.model<IShift>('Shift', ShiftSchema)