import { api } from './index'

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const APPOINTMENT_SOURCES = ['manual', 'online', 'phone', 'whatsapp'] as const

export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number]

export interface Appointment {
  id: string
  workspaceId: string
  serviceId?: string
  serviceName: string
  contactId?: string
  leadId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  assignedTo?: string
  startTime: string
  endTime: string
  duration: number
  status: AppointmentStatus
  type: 'scheduled' | 'walk_in'
  price: number
  currency: string
  notes?: string
  internalNotes?: string
  cancelReason?: string
  source: AppointmentSource
  location?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentInput {
  workspaceId: string
  serviceName: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  startTime: string
  duration?: number
  price?: number
  assignedTo?: string
  notes?: string
  status?: AppointmentStatus
  source?: AppointmentSource
  leadId?: string
  contactId?: string
  location?: string
}

export interface AppointmentAnalytics {
  byStatus: Array<{ _id: AppointmentStatus; count: number }>
  upcomingCount: number
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

export interface AnalyticsResponse {
  success: boolean
  analytics: AppointmentAnalytics
}

export interface AppointmentsQuery {
  workspaceId: string
  status?: string
  assignedTo?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

const appointmentApi = api.injectEndpoints({
  endpoints: builder => ({
    getAppointments: builder.query<AppointmentsResponse, AppointmentsQuery>({
      query: ({ workspaceId, ...rest }) => {
        const params = new URLSearchParams({ workspaceId })
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params.append(key, String(value))
        })
        return `api/appointments?${params.toString()}`
      },
      providesTags: ['Appointment'],
    }),
    getAppointment: builder.query<AppointmentResponse, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/appointments/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'Appointment', id }],
    }),
    createAppointment: builder.mutation<AppointmentResponse, AppointmentInput>({
      query: body => ({
        url: 'api/appointments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Appointment'],
    }),
    updateAppointment: builder.mutation<
      AppointmentResponse,
      { id: string; workspaceId: string } & Partial<Omit<AppointmentInput, 'workspaceId'>> & { cancelReason?: string }
    >({
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
    getAppointmentAnalytics: builder.query<AnalyticsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/appointments/analytics?workspaceId=${workspaceId}`,
      providesTags: ['Appointment'],
    }),
  }),
})

export const {
  useGetAppointmentsQuery,
  useGetAppointmentQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useGetAppointmentAnalyticsQuery,
} = appointmentApi
