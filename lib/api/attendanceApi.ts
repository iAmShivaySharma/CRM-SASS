import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface AttendanceRecord {
  _id: string
  userId: string
  workspaceId: string
  date: Date
  clockIn: Date
  clockOut?: Date
  breakStart?: Date
  breakEnd?: Date
  totalBreakTime: number
  totalWorkTime?: number
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
  approvedBy?: string
  isApproved: boolean
  overtime: boolean
  overtimeMinutes: number
  workType: 'office' | 'remote' | 'hybrid' | 'field'
  ip?: string
  device?: string
  regularHours: number
  isHoliday: boolean
  isWeekend: boolean
  shiftId?: {
    _id: string
    name: string
    startTime: string
    endTime: string
    totalHours: number
  }
  workDuration?: string
  displayStatus?: string
  createdAt: Date
  updatedAt: Date
}

export interface TodayAttendanceResponse {
  attendance: AttendanceRecord | null
  shift: {
    _id: string
    name: string
    startTime: string
    endTime: string
    totalHours: number
    breakDuration: number
    graceTime: number
  } | null
  actions: {
    canClockIn: boolean
    canClockOut: boolean
    canStartBreak: boolean
    canEndBreak: boolean
  }
  currentWorkTime: number
  expectedClockOut: Date | null
  workspaceSummary: Array<{
    _id: string
    count: number
    users: string[]
  }>
}

export interface AttendanceActionRequest {
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
  workType?: 'office' | 'remote' | 'hybrid' | 'field'
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  notes?: string
}

export interface AttendanceQuery {
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export const attendanceApi = createApi({
  reducerPath: 'attendanceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/attendance',
    credentials: 'include',
  }),
  tagTypes: ['Attendance', 'TodayAttendance'],
  endpoints: (builder) => ({
    // Get today's attendance status
    getTodayAttendance: builder.query<TodayAttendanceResponse, void>({
      query: () => '/today',
      providesTags: ['TodayAttendance'],
    }),

    // Get attendance records
    getAttendanceRecords: builder.query<
      {
        attendanceRecords: AttendanceRecord[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      AttendanceQuery
    >({
      query: (params) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString())
          }
        })
        return `?${searchParams.toString()}`
      },
      providesTags: ['Attendance'],
    }),

    // Clock in/out actions
    attendanceAction: builder.mutation<
      {
        success: boolean
        attendance: AttendanceRecord
        message: string
      },
      AttendanceActionRequest
    >({
      query: (action) => ({
        url: '',
        method: 'POST',
        body: action,
      }),
      invalidatesTags: ['TodayAttendance', 'Attendance'],
    }),

    // Get attendance summary for date range
    getAttendanceSummary: builder.query<
      {
        totalDays: number
        workingDays: number
        presentDays: number
        absentDays: number
        lateDays: number
        totalWorkHours: number
        totalOvertimeHours: number
        averageWorkHours: number
        attendanceRate: number
      },
      { userId?: string; startDate: string; endDate: string }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, value)
        })
        return `/summary?${searchParams.toString()}`
      },
      providesTags: ['Attendance'],
    }),
  }),
})

export const {
  useGetTodayAttendanceQuery,
  useGetAttendanceRecordsQuery,
  useAttendanceActionMutation,
  useGetAttendanceSummaryQuery,
} = attendanceApi