import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Appointment {
  _id: string
  workspaceId: string
  serviceId?: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  staffId?: string
  date: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentSlot {
  date: string
  startTime: string
  endTime: string
  available: boolean
}

export interface AppointmentAnalytics {
  total: number
  confirmed: number
  cancelled: number
  completed: number
  noShow: number
}

export interface AppointmentsResponse {
  success: boolean
  appointments: Appointment[]
  total?: number
}

export interface AppointmentResponse {
  success: boolean
  appointment: Appointment
}

export interface SlotsResponse {
  success: boolean
  slots: AppointmentSlot[]
}

export interface AnalyticsResponse {
  success: boolean
  analytics: AppointmentAnalytics
}

export const appointmentApi = createApi({
  reducerPath: 'appointmentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['Service', 'Appointment'],
  endpoints: builder => ({
    getAppointments: builder.query<AppointmentsResponse, { workspaceId: string; status?: string; date?: string }>({
      query: ({ workspaceId, ...rest }) => {
        const params = new URLSearchParams({ workspaceId, ...rest as Record<string, string> })
        return `api/appointments?${params.toString()}`
      },
      providesTags: ['Appointment'],
    }),
    getAppointment: builder.query<AppointmentResponse, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/appointments/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'Appointment', id }],
    }),
    createAppointment: builder.mutation<AppointmentResponse, Partial<Appointment> & { workspaceId: string }>({
      query: body => ({
        url: 'api/appointments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Appointment'],
    }),
    updateAppointment: builder.mutation<AppointmentResponse, { id: string } & Partial<Appointment>>({
      query: ({ id, ...body }) => ({
        url: `api/appointments/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Appointment', id }, 'Appointment'],
    }),
    deleteAppointment: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/appointments/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Appointment'],
    }),
    getAvailableSlots: builder.query<SlotsResponse, { workspaceId: string; date?: string; serviceId?: string }>({
      query: ({ workspaceId, ...rest }) => {
        const params = new URLSearchParams({ workspaceId, ...rest as Record<string, string> })
        return `api/appointments/available-slots?${params.toString()}`
      },
    }),
    getAppointmentAnalytics: builder.query<AnalyticsResponse, { workspaceId: string; dateFrom?: string; dateTo?: string }>({
      query: ({ workspaceId, ...rest }) => {
        const params = new URLSearchParams({ workspaceId, ...rest as Record<string, string> })
        return `api/appointments/analytics?${params.toString()}`
      },
    }),
  }),
})

export const {
  useGetAppointmentsQuery,
  useGetAppointmentQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useGetAvailableSlotsQuery,
  useGetAppointmentAnalyticsQuery,
} = appointmentApi
