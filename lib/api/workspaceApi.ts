import { api } from './index'

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

const workspaceApi = api.injectEndpoints({
  endpoints: builder => ({
    getLastActiveWorkspace: builder.query<LastActiveWorkspaceResponse, void>({
      query: () => 'api/users/last-active-workspace',
      providesTags: ['LastActiveWorkspace'],
    }),
    updateLastActiveWorkspace: builder.mutation<
      UpdateLastActiveWorkspaceResponse,
      UpdateLastActiveWorkspaceRequest
    >({
      query: ({ workspaceId }) => ({
        url: 'api/users/last-active-workspace',
        method: 'POST',
        body: { workspaceId },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['LastActiveWorkspace']))
      },
    }),
  }),
})

export const {
  useGetLastActiveWorkspaceQuery,
  useUpdateLastActiveWorkspaceMutation,
} = workspaceApi
