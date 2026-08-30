import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ProjectMemberUser {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
}

export interface ProjectMemberRole {
  id: string
  name: string
  permissions: string[]
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  roleId: string
  status: string
  invitedBy?: string
  invitedAt?: string
  joinedAt?: string
  createdAt: string
  updatedAt: string
  user?: ProjectMemberUser
  role?: ProjectMemberRole
}

export interface ProjectMembersResponse {
  members: ProjectMember[]
}

export interface AddMemberBody {
  userId: string
  roleId: string
}

export const projectMembersApi = createApi({
  reducerPath: 'projectMembersApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['ProjectMember'],
  endpoints: builder => ({
    getProjectMembers: builder.query<ProjectMembersResponse, string>({
      query: projectId => `api/projects/${projectId}/members`,
      providesTags: (result, error, projectId) => [{ type: 'ProjectMember', id: projectId }],
    }),
    addProjectMember: builder.mutation<{ member: ProjectMember }, { projectId: string } & AddMemberBody>({
      query: ({ projectId, ...body }) => ({
        url: `api/projects/${projectId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
    removeProjectMember: builder.mutation<{ success: boolean; message: string }, { projectId: string; memberId: string }>({
      query: ({ projectId, memberId }) => ({
        url: `api/projects/${projectId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'ProjectMember', id: projectId }],
    }),
  }),
})

export const {
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
} = projectMembersApi
