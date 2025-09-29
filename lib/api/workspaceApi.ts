import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface LastActiveWorkspaceResponse {
  lastActiveWorkspaceId: string | null
  workspace?: {
    id: string
    name: string
    planId?: string
    createdAt: string
    [key: string]: any
  }
}

export interface UpdateLastActiveWorkspaceRequest {
  workspaceId: string
}

export interface UpdateLastActiveWorkspaceResponse {
  message: string
}

export const workspaceApi = createApi({
  reducerPath: 'workspaceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/user',
    credentials: 'include',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['LastActiveWorkspace'],
  endpoints: builder => ({
    getLastActiveWorkspace: builder.query<LastActiveWorkspaceResponse, void>({
      query: () => 'last-active-workspace',
      providesTags: ['LastActiveWorkspace'],
    }),
    updateLastActiveWorkspace: builder.mutation<
      UpdateLastActiveWorkspaceResponse,
      UpdateLastActiveWorkspaceRequest
    >({
      query: ({ workspaceId }) => ({
        url: 'last-active-workspace',
        method: 'POST',
        body: { workspaceId },
      }),
      invalidatesTags: ['LastActiveWorkspace'],
    }),
  }),
})

export const {
  useGetLastActiveWorkspaceQuery,
  useUpdateLastActiveWorkspaceMutation,
} = workspaceApi
