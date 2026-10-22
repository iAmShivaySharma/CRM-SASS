import { api } from './index'

export interface Role {
  id: string
  name: string
  description?: string
  workspace_id: string
  is_system: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  category: string
  description?: string
  dependencies?: string[]
  conflictsWith?: string[]
  isSystemPermission: boolean
}

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions: string[]
  workspace_id: string
}

export interface UpdateRoleRequest {
  id: string
  name?: string
  description?: string
  permissions?: string[]
}

const roleApi = api.injectEndpoints({
  endpoints: builder => ({
    getRoles: builder.query<Role[], string>({
      query: (workspaceId) => `api/roles?workspaceId=${workspaceId}`,
      transformResponse: (response: any) => response.roles || response,
      providesTags: ['Role'],
    }),
    getRole: builder.query<Role, string>({
      query: id => `api/roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),
    createRole: builder.mutation<Role, CreateRoleRequest>({
      query: role => ({
        url: 'api/roles',
        method: 'POST',
        body: role,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Role']))
      },
    }),
    updateRole: builder.mutation<Role, UpdateRoleRequest>({
      query: ({ id, ...patch }) => ({
        url: `api/roles/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags([{ type: 'Role', id }]))
      },
    }),
    deleteRole: builder.mutation<void, string>({
      query: id => ({
        url: `api/roles/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Role']))
      },
    }),
  }),
})

export const {
  useGetRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi
