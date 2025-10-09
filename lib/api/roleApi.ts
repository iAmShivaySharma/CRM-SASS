import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

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

export const roleApi = createApi({
  reducerPath: 'roleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/roles',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Role', 'Permission'],
  endpoints: builder => ({
    getRoles: builder.query<Role[], void>({
      query: () => '',
      providesTags: ['Role'],
    }),
    getRole: builder.query<Role, string>({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),
    createRole: builder.mutation<Role, CreateRoleRequest>({
      query: role => ({
        url: '',
        method: 'POST',
        body: role,
      }),
      invalidatesTags: ['Role'],
    }),
    updateRole: builder.mutation<Role, UpdateRoleRequest>({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Role', id }],
    }),
    deleteRole: builder.mutation<void, string>({
      query: id => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Role'],
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
