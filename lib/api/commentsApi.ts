import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface CommentUser {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
}

export interface CommentEditHistoryEntry {
  content: string
  editedBy: CommentUser
  editedAt: string
}

export interface Comment {
  id: string
  content: string
  entityType: 'task' | 'project' | 'document'
  entityId: string
  parentId?: string
  workspaceId: string
  createdBy: CommentUser
  isEdited: boolean
  editedAt?: string
  editHistory: CommentEditHistoryEntry[]
  isDeleted: boolean
  deletedAt?: string
  deletedBy?: CommentUser
  createdAt: string
  updatedAt: string
}

export interface CommentHistoryVersion {
  content: string
  editedBy: CommentUser
  editedAt: string
  version: number
  label: string
}

export const commentsApi = createApi({
  reducerPath: 'commentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Comment'],
  endpoints: builder => ({
    getComments: builder.query<
      { comments: Comment[] },
      { entityType: string; entityId: string }
    >({
      query: ({ entityType, entityId }) =>
        `comments?entityType=${entityType}&entityId=${entityId}`,
      providesTags: (result, error, arg) =>
        result
          ? [
              {
                type: 'Comment',
                id: `${arg.entityType}_${arg.entityId}`,
              },
              ...result.comments.map(comment => ({
                type: 'Comment' as const,
                id: comment.id,
              })),
            ]
          : [{ type: 'Comment', id: `${arg.entityType}_${arg.entityId}` }],
    }),

    createComment: builder.mutation<
      { comment: Comment },
      {
        content: string
        entityType: string
        entityId: string
        parentId?: string
      }
    >({
      query: data => ({
        url: 'comments',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          commentsApi.util.invalidateTags([
            { type: 'Comment', id: `${arg.entityType}_${arg.entityId}` },
          ])
        )
      },
    }),

    updateComment: builder.mutation<
      { comment: Comment },
      { id: string; content: string }
    >({
      query: ({ id, content }) => ({
        url: `comments/${id}`,
        method: 'PUT',
        body: { content },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data: result } = await queryFulfilled
        if (result) {
          dispatch(
            commentsApi.util.invalidateTags([
              {
                type: 'Comment',
                id: `${result.comment.entityType}_${result.comment.entityId}`,
              },
              { type: 'Comment', id: result.comment.id },
            ])
          )
        } else {
          dispatch(commentsApi.util.invalidateTags(['Comment']))
        }
      },
    }),

    deleteComment: builder.mutation<
      { success: boolean },
      { id: string; entityType: string; entityId: string }
    >({
      query: ({ id }) => ({
        url: `comments/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          commentsApi.util.invalidateTags([
            { type: 'Comment', id: `${arg.entityType}_${arg.entityId}` },
          ])
        )
      },
    }),

    getCommentHistory: builder.query<
      {
        commentId: string
        versions: CommentHistoryVersion[]
        totalEdits: number
      },
      { commentId: string }
    >({
      query: ({ commentId }) => `comments/${commentId}/history`,
      providesTags: (result, error, arg) => [
        { type: 'Comment', id: arg.commentId },
      ],
    }),
  }),
})

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentHistoryQuery,
} = commentsApi
