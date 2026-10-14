import { api } from './index'

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

const shiftsApi = api.injectEndpoints({
  endpoints: builder => ({
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
        return `api/shifts?${searchParams.toString()}`
      },
      providesTags: ['Shift'],
    }),

    getShift: builder.query<Shift, string>({
      query: id => `api/shifts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Shift', id }],
    }),

    createShift: builder.mutation<
      {
        success: boolean
        shift: Shift
        message: string
      },
      CreateShiftRequest
    >({
      query: shift => ({
        url: 'api/shifts',
        method: 'POST',
        body: shift,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Shift']))
      },
    }),

    updateShift: builder.mutation<
      {
        success: boolean
        shift: Shift
        message: string
      },
      UpdateShiftRequest
    >({
      query: ({ id, ...shift }) => ({
        url: `api/shifts/${id}`,
        method: 'PUT',
        body: shift,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([{ type: 'Shift', id }, 'Shift'])
        )
      },
    }),

    deleteShift: builder.mutation<
      {
        success: boolean
        message: string
      },
      string
    >({
      query: id => ({
        url: `api/shifts/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Shift']))
      },
    }),

    setDefaultShift: builder.mutation<
      {
        success: boolean
        message: string
      },
      string
    >({
      query: id => ({
        url: `api/shifts/${id}`,
        method: 'PUT',
        body: { isDefault: true },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Shift']))
      },
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
