import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface LeaveRequestRecord {
  _id: string
  workspaceId: string
  employeeId:
    | {
        _id: string
        fullName: string
        email: string
      }
    | string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  leavePolicyId:
    | {
        _id: string
        name: string
        type: string
      }
    | string
  approvedBy?:
    | {
        _id: string
        fullName: string
      }
    | string
  approvedDate?: string
  rejectionReason?: string
  comments?: string
  attachments?: string[]
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  handoverDetails?: {
    handoverTo: string
    notes: string
  }
  appliedDate: string
  createdAt: string
  updatedAt: string
}

export interface LeaveQuery {
  workspaceId?: string
  status?: string
  employeeId?: string
  page?: number
  limit?: number
}

export interface CreateLeaveRequest {
  workspaceId?: string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  leavePolicyId: string
  attachments?: string[]
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  handoverDetails?: {
    handoverTo: string
    notes: string
  }
}

export interface UpdateLeaveRequest {
  id: string
  status?: 'approved' | 'rejected' | 'cancelled'
  comments?: string
  rejectionReason?: string
  leaveType?: string
  startDate?: string
  endDate?: string
  totalDays?: number
  reason?: string
  leavePolicyId?: string
}

export interface LeaveStats {
  pendingCount: number
  approvedThisMonth: number
  totalDaysUsedThisYear: number
  upcomingLeaves: number
  leaveTypeBreakdown: Array<{
    _id: string
    count: number
    totalDays: number
  }>
}

export const leaveApi = createApi({
  reducerPath: 'leaveApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/leaves',
    credentials: 'include',
  }),
  tagTypes: ['Leave', 'LeaveStats'],
  endpoints: builder => ({
    getLeaveRequests: builder.query<
      {
        leaveRequests: LeaveRequestRecord[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      LeaveQuery
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
      providesTags: ['Leave'],
    }),

    getLeaveRequest: builder.query<
      { leaveRequest: LeaveRequestRecord },
      string
    >({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Leave', id }],
    }),

    createLeaveRequest: builder.mutation<
      { success: boolean; leaveRequest: LeaveRequestRecord },
      CreateLeaveRequest
    >({
      query: body => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Leave', 'LeaveStats'],
    }),

    updateLeaveRequest: builder.mutation<
      { success: boolean; leaveRequest: LeaveRequestRecord },
      UpdateLeaveRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leave', id },
        'Leave',
        'LeaveStats',
      ],
    }),

    deleteLeaveRequest: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Leave', 'LeaveStats'],
    }),

    getLeaveStats: builder.query<LeaveStats, { workspaceId?: string }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        if (params.workspaceId) {
          searchParams.append('workspaceId', params.workspaceId)
        }
        return `../leaves/stats?${searchParams.toString()}`
      },
      providesTags: ['LeaveStats'],
    }),
  }),
})

export const {
  useGetLeaveRequestsQuery,
  useGetLeaveRequestQuery,
  useCreateLeaveRequestMutation,
  useUpdateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetLeaveStatsQuery,
} = leaveApi
