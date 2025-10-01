import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { RootState } from '../store'

// API Types
export interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status: string
  statusId?: string | { id: string; name: string; color: string }
  source: string
  value?: number
  assignedTo?: string | { id: string; fullName: string; email: string }
  tags?: string[]
  tagIds?: string[] | { id: string; name: string; color: string }[]
  notes?: string
  priority: 'low' | 'medium' | 'high'
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  nextFollowUpAt?: string
  customFields?: Record<string, any>
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  workspaceId: string
  isDefault: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface LeadStatus {
  id: string
  name: string
  color: string
  description?: string
  order: number
  isDefault: boolean
  isActive: boolean
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  description?: string
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  roleId: string
  status: 'active' | 'inactive' | 'pending'
  joinedAt: string
  user: {
    id: string
    fullName: string
    email: string
  }
}

export interface Activity {
  id: string
  type: string
  description: string
  entityType: string
  entityId: string
  workspaceId: string
  userId: string
  metadata?: Record<string, any>
  createdAt: string
}

export interface LeadActivity {
  id: string
  leadId: string
  workspaceId: string
  activityType:
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'assigned'
    | 'note_added'
    | 'converted'
    | 'deleted'
  performedBy:
    | string
    | {
        id: string
        fullName: string
        email: string
        avatar?: string
      }
  description: string
  changes?: {
    field: string
    oldValue?: any
    newValue?: any
  }[]
  metadata?: Record<string, any>
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  slug: string
  ownerId: string
  currency: string
  timezone: string
  settings: {
    dateFormat: string
    timeFormat: string
    weekStartsOn: number
    language: string
  }
  planId: string
  subscriptionStatus: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  fullName: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export const mongoApi = createApi({
  reducerPath: 'mongoApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include', // Include cookies for authentication
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: [
    'Lead',
    'Role',
    'Workspace',
    'Activity',
    'User',
    'LeadStatus',
    'Tag',
    'WorkspaceMember',
    'LeadActivity',
  ],
  endpoints: builder => ({
    // Leads
    getLeads: builder.query<
      { leads: Lead[]; pagination: any },
      {
        workspaceId: string
        page?: number
        limit?: number
        status?: string
        search?: string
      }
    >({
      query: ({ workspaceId, page = 1, limit = 20, status, search }) => {
        const params = new URLSearchParams({
          workspaceId,
          page: page.toString(),
          limit: limit.toString(),
        })
        if (status) params.append('status', status)
        if (search) params.append('search', search)
        return `leads?${params}`
      },
      providesTags: ['Lead'],
    }),

    createLead: builder.mutation<
      { lead: Lead },
      Partial<Lead> & { workspaceId: string }
    >({
      query: leadData => ({
        url: `leads?workspaceId=${leadData.workspaceId}`,
        method: 'POST',
        body: leadData,
      }),
      invalidatesTags: ['Lead'],
    }),

    updateLead: builder.mutation<
      { lead: Lead },
      { id: string; workspaceId: string } & Partial<Lead>
    >({
      query: ({ id, workspaceId, ...updates }) => ({
        url: `leads/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['Lead'],
    }),

    deleteLead: builder.mutation<void, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `leads/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Lead'],
    }),

    // Lead Activities
    getLeadActivities: builder.query<
      { activities: LeadActivity[] },
      { leadId: string; workspaceId: string; limit?: number }
    >({
      query: ({ leadId, workspaceId, limit = 50 }) => ({
        url: `leads/${leadId}/activities?workspaceId=${workspaceId}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: (result, error, { leadId }) => [
        { type: 'LeadActivity', id: leadId },
        'LeadActivity',
      ],
    }),

    createLeadActivity: builder.mutation<
      { activity: LeadActivity },
      {
        leadId: string
        workspaceId: string
        activityType: string
        description: string
        changes?: { field: string; oldValue: any; newValue: any }[]
        metadata?: Record<string, any>
      }
    >({
      query: ({ leadId, workspaceId, ...body }) => ({
        url: `leads/${leadId}/activities?workspaceId=${workspaceId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { leadId }) => [
        { type: 'LeadActivity', id: leadId },
        'LeadActivity',
      ],
    }),

    // Roles
    getRoles: builder.query<{ success: boolean; roles: Role[] }, string>({
      query: workspaceId => `roles?workspaceId=${workspaceId}`,
      providesTags: ['Role'],
    }),

    createRole: builder.mutation<
      { success: boolean; role: Role },
      Partial<Role>
    >({
      query: role => ({
        url: `roles?workspaceId=${role.workspaceId}`,
        method: 'POST',
        body: role,
      }),
      invalidatesTags: ['Role'],
    }),
    deleteRole: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `roles/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Role'],
    }),

    // Workspaces
    getUserWorkspaces: builder.query<
      { success: boolean; workspaces: Workspace[] },
      string
    >({
      query: userId => `workspaces?userId=${userId}`,
      providesTags: ['Workspace'],
    }),

    // Lead Statuses
    getLeadStatuses: builder.query<
      { success: boolean; statuses: LeadStatus[] },
      string
    >({
      query: workspaceId => `lead-statuses?workspaceId=${workspaceId}`,
      providesTags: ['LeadStatus'],
    }),
    createLeadStatus: builder.mutation<
      { success: boolean; status: LeadStatus },
      Partial<LeadStatus>
    >({
      query: status => ({
        url: `lead-statuses?workspaceId=${status.workspaceId}`,
        method: 'POST',
        body: status,
      }),
      invalidatesTags: ['LeadStatus'],
    }),
    deleteLeadStatus: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `lead-statuses/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LeadStatus'],
    }),

    // Tags
    getTags: builder.query<{ success: boolean; tags: Tag[] }, string>({
      query: workspaceId => `tags?workspaceId=${workspaceId}`,
      providesTags: ['Tag'],
    }),
    createTag: builder.mutation<{ success: boolean; tag: Tag }, Partial<Tag>>({
      query: tag => ({
        url: `tags?workspaceId=${tag.workspaceId}`,
        method: 'POST',
        body: tag,
      }),
      invalidatesTags: ['Tag'],
    }),
    deleteTag: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `tags/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tag'],
    }),

    // Activities
    getActivities: builder.query<
      { success: boolean; activities: Activity[] },
      { workspaceId: string; limit?: number }
    >({
      query: ({ workspaceId, limit = 50 }) =>
        `activities?workspaceId=${workspaceId}&limit=${limit}`,
      providesTags: ['Activity'],
    }),

    // Workspaces
    getWorkspace: builder.query<{ success: boolean; workspace: any }, string>({
      query: workspaceId => `workspaces/${workspaceId}`,
      providesTags: ['Workspace'],
    }),

    createWorkspace: builder.mutation<
      { success: boolean; workspace: any },
      { name: string; description?: string }
    >({
      query: workspace => ({
        url: 'workspaces',
        method: 'POST',
        body: workspace,
      }),
      invalidatesTags: ['Workspace'],
    }),
    updateWorkspace: builder.mutation<
      { success: boolean; workspace: any },
      { id: string; [key: string]: any }
    >({
      query: ({ id, ...data }) => ({
        url: `workspaces/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Workspace'],
      // Redux state is updated in the component after successful update
    }),

    // Workspace Members
    getWorkspaceMembers: builder.query<
      { success: boolean; members: WorkspaceMember[] },
      string
    >({
      query: workspaceId => `workspaces/${workspaceId}/members`,
      providesTags: ['WorkspaceMember'],
    }),

    // Workspace Roles
    getWorkspaceRoles: builder.query<
      { success: boolean; roles: Role[] },
      string
    >({
      query: workspaceId => `workspaces/${workspaceId}/roles`,
      providesTags: ['Role'],
    }),

    // Workspace Invites
    inviteToWorkspace: builder.mutation<
      { success: boolean; message: string },
      {
        workspaceId: string
        email: string
        roleId: string
        message?: string
      }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `workspaces/${workspaceId}/invites`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WorkspaceMember'],
    }),

    // Lead Notes
    createLeadNote: builder.mutation<
      { success: boolean; note: any },
      {
        leadId: string
        workspaceId: string
        content: string
        type: string
        isPrivate?: boolean
      }
    >({
      query: ({ leadId, workspaceId, ...body }) => ({
        url: `leads/${leadId}/notes?workspaceId=${workspaceId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { leadId }) => [
        { type: 'Lead', id: leadId },
        'LeadActivity',
      ],
    }),
  }),
})

export const {
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useGetLeadActivitiesQuery,
  useCreateLeadActivityMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetUserWorkspacesQuery,
  useGetLeadStatusesQuery,
  useCreateLeadStatusMutation,
  useDeleteLeadStatusMutation,
  useGetTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
  useGetActivitiesQuery,
  useGetWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useGetWorkspaceRolesQuery,
  useInviteToWorkspaceMutation,
  useCreateLeadNoteMutation,
} = mongoApi

// Removed old mock permissions - now using real permission system
