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
  workspaceId?: string
}

export interface AttendanceQuery {
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  workspaceId: string
}

export const attendanceApi = createApi({
  reducerPath: 'attendanceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/attendance',
    credentials: 'include',
  }),
  tagTypes: ['Attendance', 'TodayAttendance', 'Employees'],
  endpoints: (builder) => ({
    // Get today's attendance status
    getTodayAttendance: builder.query<TodayAttendanceResponse, { workspaceId: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams()
        searchParams.append('workspaceId', params.workspaceId)
        return `/today?${searchParams.toString()}`
      },
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
      AttendanceActionRequest & { workspaceId: string }
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
        summary: {
          totalDays: number
          workingDays: number
          presentDays: number
          absentDays: number
          lateDays: number
          totalWorkHours: number
          totalOvertimeHours: number
          averageWorkHours: number
          attendanceRate: number
        }
        todayAttendance: {
          total: number
          byStatus: Record<string, any[]>
          records: any[]
        }
        dateRange: {
          start: string
          end: string
        }
      },
      { userId?: string; startDate?: string; endDate?: string; workspaceId: string }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) {
            searchParams.append(key, value)
          }
        })
        return `/summary?${searchParams.toString()}`
      },
      providesTags: ['Attendance'],
    }),

    // Get employees/users in workspace
    getEmployees: builder.query<
      {
        employees: Array<{
          _id: string
          userId: string
          fullName: string
          email: string
          avatar?: string
          role: {
            _id: string
            name: string
          }
          joinedAt: string
          status: string
          lastActive?: string
          todayAttendance?: {
            _id: string
            status: string
            clockIn: string
            clockOut?: string
            totalWorkTime: number
            workType: string
            shift?: any
          }
        }>
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      { page?: number; limit?: number; search?: string; includeAttendance?: boolean; workspaceId: string }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString())
          }
        })
        return {
          url: `../employees?${searchParams.toString()}`,
          method: 'GET'
        }
      },
      providesTags: ['Employees'],
    }),
  }),
})

export const {
  useGetTodayAttendanceQuery,
  useGetAttendanceRecordsQuery,
  useAttendanceActionMutation,
  useGetAttendanceSummaryQuery,
  useGetEmployeesQuery,
} = attendanceApi