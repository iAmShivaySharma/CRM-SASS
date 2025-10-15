import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Shift {
  _id: string
  name: string
  workspaceId: string
  startTime: string
  endTime: string
  breakDuration: number
  workingDays: number[]
  totalHours: number
  isFlexible: boolean
  graceTime: number
  isDefault: boolean
  isActive: boolean
  timezone: string
  createdBy: {
    _id: string
    name: string
    email: string
  }
  description?: string
  color: string
  allowedWorkTypes: string[]
  overtimeRules: {
    allowOvertime: boolean
    maxOvertimeHours: number
    overtimeMultiplier: number
  }
  employeeCount: number
  durationDisplay?: string
  timeRange?: string
  createdAt: string
  updatedAt: string
}

export interface CreateShiftRequest {
  name: string
  startTime: string
  endTime: string
  workingDays?: number[]
  breakDuration?: number
  graceTime?: number
  description?: string
  isActive?: boolean
  isDefault?: boolean
  isFlexible?: boolean
  color?: string
  allowedWorkTypes?: string[]
  overtimeRules?: {
    allowOvertime: boolean
    maxOvertimeHours: number
    overtimeMultiplier: number
  }
}

export interface UpdateShiftRequest extends Partial<CreateShiftRequest> {
  id: string
}

export interface ShiftsQuery {
  page?: number
  limit?: number
  includeInactive?: boolean
}

export const shiftsApi = createApi({
  reducerPath: 'shiftsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/shifts',
    credentials: 'include',
  }),
  tagTypes: ['Shift'],
  endpoints: (builder) => ({
    // Get all shifts
    getShifts: builder.query<
      {
        shifts: Shift[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      ShiftsQuery
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString())
          }
        })
        return `?${searchParams.toString()}`
      },
      providesTags: ['Shift'],
    }),

    // Get single shift
    getShift: builder.query<Shift, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Shift', id }],
    }),

    // Create shift
    createShift: builder.mutation<
      {
        success: boolean
        shift: Shift
        message: string
      },
      CreateShiftRequest
    >({
      query: (shift) => ({
        url: '',
        method: 'POST',
        body: shift,
      }),
      invalidatesTags: ['Shift'],
    }),

    // Update shift
    updateShift: builder.mutation<
      {
        success: boolean
        shift: Shift
        message: string
      },
      UpdateShiftRequest
    >({
      query: ({ id, ...shift }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: shift,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Shift', id }, 'Shift'],
    }),

    // Delete shift
    deleteShift: builder.mutation<
      {
        success: boolean
        message: string
      },
      string
    >({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Shift'],
    }),

    // Set default shift
    setDefaultShift: builder.mutation<
      {
        success: boolean
        message: string
      },
      string
    >({
      query: (id) => ({
        url: `/${id}`,
        method: 'PUT',
        body: { isDefault: true },
      }),
      invalidatesTags: ['Shift'],
    }),
  }),
})

export const {
  useGetShiftsQuery,
  useGetShiftQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useSetDefaultShiftMutation,
} = shiftsApi