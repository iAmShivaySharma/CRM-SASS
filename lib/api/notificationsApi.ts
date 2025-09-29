import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  actionUrl?: string
  entityType?: string
  entityId?: string
}

export interface NotificationsResponse {
  success: boolean
  notifications: Notification[]
  total: number
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface NotificationFilters {
  workspaceId: string
  limit?: number
  offset?: number
  unreadOnly?: boolean
  entityType?: string
}

export interface MarkNotificationRequest {
  notificationId?: string
  action: 'markAsRead' | 'markAllAsRead'
  workspaceId: string
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/notifications',
    credentials: 'include',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Notification'],
  endpoints: builder => ({
    // Get notifications for current user
    getNotifications: builder.query<NotificationsResponse, NotificationFilters>(
      {
        query: ({
          workspaceId,
          limit = 20,
          offset = 0,
          unreadOnly = false,
          entityType,
        }) => {
          const params = new URLSearchParams({
            workspaceId,
            limit: limit.toString(),
            offset: offset.toString(),
            unreadOnly: unreadOnly.toString(),
          })

          if (entityType) {
            params.append('entityType', entityType)
          }

          return `?${params}`
        },
        providesTags: ['Notification'],
      }
    ),

    // Mark notification as read or mark all as read
    updateNotification: builder.mutation<
      { success: boolean; result: boolean | number; message: string },
      MarkNotificationRequest
    >({
      query: ({ notificationId, action, workspaceId }) => ({
        url: '',
        method: 'PATCH',
        body: { notificationId, action, workspaceId },
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const { useGetNotificationsQuery, useUpdateNotificationMutation } =
  notificationsApi
