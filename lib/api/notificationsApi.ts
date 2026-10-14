import { api } from './index'

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

const notificationsApi = api.injectEndpoints({
  endpoints: builder => ({
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

          return `api/notifications?${params}`
        },
        providesTags: ['Notification'],
      }
    ),

    updateNotification: builder.mutation<
      { success: boolean; result: boolean | number; message: string },
      MarkNotificationRequest
    >({
      query: ({ notificationId, action, workspaceId }) => ({
        url: 'api/notifications',
        method: 'PATCH',
        body: { notificationId, action, workspaceId },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Notification']))
      },
    }),
  }),
})

export const { useGetNotificationsQuery, useUpdateNotificationMutation } =
  notificationsApi
