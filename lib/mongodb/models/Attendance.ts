import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  date: Date
  clockIn: Date
  clockOut?: Date
  breakStart?: Date
  breakEnd?: Date
  totalBreakTime: number // in minutes
  totalWorkTime?: number // in minutes
  status: 'clocked_in' | 'on_break' | 'clocked_out' | 'absent' | 'late' | 'half_day'
  location?: {
    clockInLocation?: {
      latitude: number
      longitude: number
      address?: string
    }
    clockOutLocation?: {
      latitude: number
      longitude: number
      address?: string
    }
  }
  notes?: string
  approvedBy?: mongoose.Types.ObjectId
  isApproved: boolean
  overtime: boolean
  overtimeMinutes: number
  workType: 'office' | 'remote' | 'hybrid' | 'field'
  ip?: string
  device?: string
  browser?: string
  regularHours: number // Standard work hours for this day
  isHoliday: boolean
  isWeekend: boolean
  shiftId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date

  // Instance methods
  calculateTotalWorkTime(): number
  calculateOvertime(): number
  isLate(standardStartTime: string): boolean
  getWorkDuration(): string
  markAsApproved(approvedBy: mongoose.Types.ObjectId): Promise<IAttendance>
}

export interface IAttendanceModel extends Model<IAttendance> {
  getTodayAttendance(userId: string, workspaceId: string): Promise<IAttendance | null>
  getAttendanceRange(userId: string, workspaceId: string, startDate: Date, endDate: Date): Promise<IAttendance[]>
  getWorkspaceSummary(workspaceId: string, date: Date): Promise<any[]>
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    clockIn: {
      type: Date,
      required: true,
      index: true
    },
    clockOut: {
      type: Date,
      index: true
    },
    breakStart: {
      type: Date
    },
    breakEnd: {
      type: Date
    },
    totalBreakTime: {
      type: Number,
      default: 0,
      min: 0
    },
    totalWorkTime: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ['clocked_in', 'on_break', 'clocked_out', 'absent', 'late', 'half_day'],
      default: 'clocked_in',
      index: true
    },
    location: {
      clockInLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
      },
      clockOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    overtime: {
      type: Boolean,
      default: false,
      index: true
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    workType: {
      type: String,
      enum: ['office', 'remote', 'hybrid', 'field'],
      default: 'office',
      index: true
    },
    ip: {
      type: String
    },
    device: {
      type: String
    },
    browser: {
      type: String
    },
    regularHours: {
      type: Number,
      default: 8, // 8 hours standard
      min: 0,
      max: 24
    },
    isHoliday: {
      type: Boolean,
      default: false,
      index: true
    },
    isWeekend: {
      type: Boolean,
      default: false,
      index: true
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Compound indexes for efficient queries
AttendanceSchema.index({ workspaceId: 1, date: -1, status: 1 })
AttendanceSchema.index({ userId: 1, workspaceId: 1, date: -1 }, { unique: true })

// Virtual for formatted work duration
AttendanceSchema.virtual('workDuration').get(function() {
  if (!this.clockOut) return 'Still working...'

  const duration = this.calculateTotalWorkTime()
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  return `${hours}h ${minutes}m`
})

// Virtual for attendance status display
AttendanceSchema.virtual('displayStatus').get(function() {
  switch (this.status) {
    case 'clocked_in': return 'Working'
    case 'on_break': return 'On Break'
    case 'clocked_out': return 'Finished'
    case 'absent': return 'Absent'
    case 'late': return 'Late'
    case 'half_day': return 'Half Day'
    default: return this.status
  }
})

// Instance method to calculate total work time
AttendanceSchema.methods.calculateTotalWorkTime = function(): number {
  if (!this.clockIn) {
    return 0
  }

  if (!this.clockOut) {
    // Still working - calculate current work time
    const now = new Date()
    const workTime = Math.floor((now.getTime() - this.clockIn.getTime()) / (1000 * 60))
    return Math.max(0, workTime - (this.totalBreakTime || 0))
  }

  const workTime = Math.floor((this.clockOut.getTime() - this.clockIn.getTime()) / (1000 * 60))
  return Math.max(0, workTime - (this.totalBreakTime || 0))
}

// Instance method to calculate overtime
AttendanceSchema.methods.calculateOvertime = function(): number {
  const totalWorkTime = this.calculateTotalWorkTime()
  const regularMinutes = this.regularHours * 60
  return Math.max(0, totalWorkTime - regularMinutes)
}

// Instance method to check if arrival was late
AttendanceSchema.methods.isLate = function(standardStartTime: string): boolean {
  const [hours, minutes] = standardStartTime.split(':').map(Number)
  const startTime = new Date(this.date)
  startTime.setHours(hours, minutes, 0, 0)

  return this.clockIn > startTime
}

// Instance method to get formatted work duration
AttendanceSchema.methods.getWorkDuration = function(): string {
  const duration = this.calculateTotalWorkTime()
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  return `${hours}h ${minutes}m`
}

// Instance method to mark as approved
AttendanceSchema.methods.markAsApproved = function(approvedBy: mongoose.Types.ObjectId) {
  this.isApproved = true
  this.approvedBy = approvedBy
  return this.save()
}

// Static method to get today's attendance for user
AttendanceSchema.statics.getTodayAttendance = function(userId: string, workspaceId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return this.findOne({
    userId,
    workspaceId,
    date: { $gte: today, $lt: tomorrow }
  })
}

// Static method to get attendance for date range
AttendanceSchema.statics.getAttendanceRange = function(
  userId: string,
  workspaceId: string,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    userId,
    workspaceId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 })
}

// Static method to get workspace attendance summary
AttendanceSchema.statics.getWorkspaceSummary = function(workspaceId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return this.aggregate([
    {
      $match: {
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        date: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        users: { $push: '$userId' }
      }
    }
  ])
}

// Pre-save middleware to calculate fields
AttendanceSchema.pre('save', function(next) {
  // Set date to start of day for consistency
  if (this.isModified('clockIn')) {
    const clockInDate = new Date(this.clockIn)
    this.date = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate())
  }

  // Calculate total work time if clocked out
  if (this.clockOut && this.isModified('clockOut')) {
    this.totalWorkTime = this.calculateTotalWorkTime()
    this.overtimeMinutes = this.calculateOvertime()
    this.overtime = this.overtimeMinutes > 0
    this.status = 'clocked_out'
  }

  // Check if it's weekend
  const dayOfWeek = this.date.getDay()
  this.isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  next()
})

export default (mongoose.models.Attendance as IAttendanceModel) ||
  mongoose.model<IAttendance, IAttendanceModel>('Attendance', AttendanceSchema)