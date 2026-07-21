import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ChatRoom {
  id: string
  name: string
  description?: string
  type: 'general' | 'private' | 'direct'
  workspaceId: string
  participants: string[] | User[]
  admins: string[] | User[]
  isArchived: boolean
  lastMessage?: {
    content: string
    senderId: string
    senderName: string
    timestamp: string
    type: 'text' | 'file' | 'image' | 'system'
  }
  settings: {
    allowFileSharing: boolean
    allowReactions: boolean
    retentionDays: number
    notifications: boolean
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  content: string
  type: 'text' | 'file' | 'image' | 'system'
  chatRoomId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isEdited: boolean
  editedAt?: string
  replyTo?: string | Message
  reactions: {
    emoji: string
    userId: string
    userName: string
  }[]
  readBy: {
    userId: string
    readAt: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface CreateChatRoomData {
  name: string
  description?: string
  type?: 'general' | 'private' | 'direct'
  participants?: string[]
  workspaceId: string
}

export interface CreateMessageData {
  chatRoomId: string
  content: string
  type?: 'text' | 'file' | 'image'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  replyTo?: string
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/chat',
    credentials: 'include',
    prepareHeaders: (headers, { endpoint }) => {
      if (endpoint !== 'uploadFile') {
        headers.set('Content-Type', 'application/json')
      }
      return headers
    },
  }),
  tagTypes: ['ChatRoom', 'Message'],
  endpoints: builder => ({
    getChatRooms: builder.query<
      { chatRooms: ChatRoom[] },
      { workspaceId: string; includeArchived?: boolean }
    >({
      query: ({ workspaceId, includeArchived = false }) => {
        const params = new URLSearchParams({ workspaceId })
        if (includeArchived) {
          params.append('includeArchived', 'true')
        }
        return `rooms?${params}`
      },
      providesTags: ['ChatRoom'],
    }),

    createChatRoom: builder.mutation<
      { chatRoom: ChatRoom },
      CreateChatRoomData
    >({
      query: roomData => ({
        url: 'rooms',
        method: 'POST',
        body: roomData,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(chatApi.util.invalidateTags(['ChatRoom']))
      },
    }),

    updateChatRoom: builder.mutation<
      { chatRoom: ChatRoom },
      { id: string; workspaceId: string } & Partial<ChatRoom>
    >({
      query: ({ id, workspaceId, ...updates }) => ({
        url: `rooms/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body: updates,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(chatApi.util.invalidateTags(['ChatRoom']))
      },
    }),

    deleteChatRoom: builder.mutation<void, { id: string; workspaceId: string }>(
      {
        query: ({ id, workspaceId }) => ({
          url: `rooms/${id}?workspaceId=${workspaceId}`,
          method: 'DELETE',
        }),
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          await queryFulfilled
          dispatch(chatApi.util.invalidateTags(['ChatRoom']))
        },
      }
    ),

    getMessages: builder.query<
      {
        messages: Message[]
        pagination: {
          page: number
          limit: number
          total: number
          hasMore: boolean
        }
      },
      {
        chatRoomId: string
        page?: number
        limit?: number
      }
    >({
      query: ({ chatRoomId, page = 1, limit = 50 }) => {
        const params = new URLSearchParams({
          chatRoomId,
          page: page.toString(),
          limit: limit.toString(),
        })
        return `messages?${params}`
      },
      providesTags: (result, error, { chatRoomId }) => [
        { type: 'Message', id: chatRoomId },
        'Message',
      ],
      serializeQueryArgs: ({ queryArgs }) => {
        const { chatRoomId } = queryArgs
        return chatRoomId
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems
        }
        return {
          ...newItems,
          messages: [...currentCache.messages, ...newItems.messages],
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page
      },
    }),

    createMessage: builder.mutation<{ message: Message }, CreateMessageData>({
      query: messageData => ({
        url: 'messages',
        method: 'POST',
        body: messageData,
      }),
      async onQueryStarted({ chatRoomId }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          chatApi.util.invalidateTags([
            { type: 'Message', id: chatRoomId },
            'ChatRoom',
          ])
        )
      },
    }),

    deleteMessage: builder.mutation<
      void,
      { messageId: string; chatRoomId: string }
    >({
      query: ({ messageId, chatRoomId }) => ({
        url: `messages/${messageId}?chatRoomId=${chatRoomId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ chatRoomId }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          chatApi.util.invalidateTags([{ type: 'Message', id: chatRoomId }])
        )
      },
    }),

    markMessagesAsRead: builder.mutation<
      void,
      { chatRoomId: string; messageIds?: string[] }
    >({
      query: data => ({
        url: 'messages/read',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted({ chatRoomId }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          chatApi.util.invalidateTags([{ type: 'Message', id: chatRoomId }])
        )
      },
    }),

    addReaction: builder.mutation<
      void,
      { messageId: string; emoji: string; chatRoomId: string }
    >({
      query: data => ({
        url: `messages/${data.messageId}/reactions`,
        method: 'POST',
        body: { emoji: data.emoji, chatRoomId: data.chatRoomId },
      }),
    }),

    removeReaction: builder.mutation<
      void,
      { messageId: string; emoji: string; chatRoomId: string }
    >({
      query: data => ({
        url: `messages/${data.messageId}/reactions`,
        method: 'DELETE',
        body: { emoji: data.emoji, chatRoomId: data.chatRoomId },
      }),
    }),

    uploadFile: builder.mutation<
      {
        success: boolean
        file: {
          url: string
          name: string
          size: number
          type: string
          path: string
        }
      },
      {
        file: File
        workspaceId: string
        chatRoomId: string
      }
    >({
      query: ({ file, workspaceId, chatRoomId }) => {
        const formData = new FormData()
        formData.append('file', file)

        return {
          url: `upload?workspaceId=${workspaceId}&chatRoomId=${chatRoomId}`,
          method: 'POST',
          body: formData,
        }
      },
    }),

    getUploadConfig: builder.query<
      {
        config: {
          maxFileSize: number
          allowedTypes: string[]
          maxFileSizeMB: number
          allowedExtensions: Record<string, string[]>
        }
      },
      void
    >({
      query: () => 'upload',
    }),
  }),
})

export const {
  useGetChatRoomsQuery,
  useCreateChatRoomMutation,
  useUpdateChatRoomMutation,
  useDeleteChatRoomMutation,
  useGetMessagesQuery,
  useCreateMessageMutation,
  useDeleteMessageMutation,
  useMarkMessagesAsReadMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useUploadFileMutation,
  useGetUploadConfigQuery,
} = chatApi
