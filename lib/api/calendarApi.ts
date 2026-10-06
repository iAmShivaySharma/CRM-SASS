import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from './baseQuery'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  type: 'follow-up' | 'task' | 'meeting' | 'event'
  entityType: 'lead' | 'task' | 'meeting'
  entityId: string
  assignedTo?: string
  priority?: string
  status?: string
  metadata?: Record<string, any>
}

export interface CalendarEventsResponse {
  success: boolean
  events: CalendarEvent[]
}

export interface CreateEventBody {
  workspaceId: string
  title: string
  start: string
  end?: string
  type?: string
  entityType?: string
  entityId?: string
}

export const calendarApi = createApi({
  reducerPath: 'calendarApi',
  baseQuery: createBaseQuery(''),
  tagTypes: ['CalendarEvent'],
  endpoints: builder => ({
    getCalendarEvents: builder.query<CalendarEventsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/calendar/events?workspaceId=${workspaceId}`,
      providesTags: ['CalendarEvent'],
    }),
    createCalendarEvent: builder.mutation<{ success: boolean; message: string }, CreateEventBody>({
      query: body => ({ url: 'api/calendar/events', method: 'POST', body }),
      invalidatesTags: ['CalendarEvent'],
    }),
  }),
})

export const { useGetCalendarEventsQuery, useCreateCalendarEventMutation } = calendarApi
