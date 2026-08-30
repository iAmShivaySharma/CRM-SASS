import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Employee {
  _id: string
  userId: string
  fullName: string
  email: string
  avatar?: string
  role: { _id: string; name: string }
  joinedAt: string
  status: string
  lastActive?: string
  todayAttendance?: {
    _id: string
    status: string
    clockIn?: string
    clockOut?: string
    totalWorkTime?: number
    workType?: string
    shift?: { name: string; startTime: string; endTime: string }
  } | null
}

export interface EmployeesResponse {
  employees: Employee[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export interface CreateEmployeeBody {
  workspaceId: string
  fullName: string
  email: string
  roleId: string
  department?: string
  position?: string
  startDate?: string
}

export const employeesApi = createApi({
  reducerPath: 'employeesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['Employee'],
  endpoints: builder => ({
    getEmployees: builder.query<
      EmployeesResponse,
      {
        workspaceId: string
        page?: number
        limit?: number
        search?: string
        includeAttendance?: boolean
      }
    >({
      query: ({ workspaceId, page = 1, limit = 20, search, includeAttendance }) => {
        const params = new URLSearchParams({ workspaceId, page: String(page), limit: String(limit) })
        if (search) params.set('search', search)
        if (includeAttendance) params.set('includeAttendance', 'true')
        return `api/employees?${params.toString()}`
      },
      providesTags: ['Employee'],
    }),
    createEmployee: builder.mutation<{ success: boolean; employee: Employee; message: string }, CreateEmployeeBody>({
      query: body => ({ url: 'api/employees', method: 'POST', body }),
      invalidatesTags: ['Employee'],
    }),
  }),
})

export const { useGetEmployeesQuery, useCreateEmployeeMutation } = employeesApi
