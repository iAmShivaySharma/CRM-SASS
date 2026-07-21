import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Project {
  id: string
  name: string
  description?: string
  slug: string
  icon?: string
  color: string
  status: 'active' | 'archived' | 'completed'
  visibility: 'private' | 'workspace' | 'public'
  startDate?: string
  endDate?: string
  workspaceId: string
  createdBy: string
  settings: {
    allowMemberInvite: boolean
    allowJoinRequests: boolean
    defaultTaskStatus: string
    enableTimeTracking: boolean
  }
  createdAt: string
  updatedAt: string
  memberCount?: number
  taskCount?: number
  completedTaskCount?: number
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  roleId: string
  status: 'pending' | 'active' | 'inactive' | 'removed'
  invitedBy?: string
  invitedAt?: string
  joinedAt?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  role?: {
    id: string
    name: string
    permissions: string[]
  }
}

export interface Task {
  id: string
  title: string
  description?: string
  projectId: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  createdBy: string
  tags?: string[]
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  completed: boolean
  completedAt?: string
  completedBy?: string
  timeTracking?: {
    isActive: boolean
    totalTracked: number
    sessions: {
      startedAt: string
      endedAt?: string
      duration?: number
      userId: string
    }[]
    currentSessionStart?: string
  }
  sprintId?: string
  order: number
  dependencies?: string[]
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
  customFields?: Record<string, any>
  workspaceId: string
  createdAt: string
  updatedAt: string
  assignee?: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
}

export interface Document {
  id: string
  title: string
  content: string
  projectId: string
  folderId?: string
  type: 'document' | 'template' | 'note'
  status: 'draft' | 'published' | 'archived'
  visibility: 'private' | 'project' | 'workspace'
  createdBy: string
  lastEditedBy?: string
  lastEditedAt?: string
  tags?: string[]
  customProperties?: Record<string, any>
  version: number
  templateId?: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectInvitation {
  id: string
  projectId: string
  inviteeEmail: string
  inviteeId?: string
  inviterId: string
  roleId: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: string
  message?: string
  acceptedAt?: string
  declinedAt?: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectJoinRequest {
  id: string
  projectId: string
  userId: string
  requesterId: string
  status: 'pending' | 'approved' | 'denied'
  message?: string
  approvedBy?: string
  approvedAt?: string
  deniedBy?: string
  deniedAt?: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export interface Sprint {
  id: string
  name: string
  goal?: string
  projectId: string
  workspaceId: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: string
  endDate: string
  createdBy: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  completedAt?: string
  taskCount: number
  completedTaskCount: number
  createdAt: string
  updatedAt: string
}

export interface Column {
  id: string
  name: string
  slug: string
  color: string
  projectId: string
  workspaceId: string
  order: number
  isDefault: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: [
    'Project',
    'ProjectMember',
    'Task',
    'Document',
    'ProjectInvitation',
    'ProjectJoinRequest',
    'Column',
    'Tag',
    'Sprint',
  ],
  endpoints: builder => ({
    getProjects: builder.query<
      { projects: Project[]; pagination: any },
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
        return `projects?${params}`
      },
      providesTags: result =>
        result
          ? [
              { type: 'Project', id: 'LIST' },
              ...result.projects.map(project => ({
                type: 'Project' as const,
                id: project.id,
              })),
            ]
          : [{ type: 'Project', id: 'LIST' }],
    }),

    getProject: builder.query<{ project: Project }, { id: string }>({
      query: ({ id }) => `projects/${id}`,
      providesTags: ['Project'],
    }),

    createProject: builder.mutation<
      { project: Project },
      Partial<Project> & { workspaceId: string }
    >({
      query: data => ({
        url: 'projects',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([{ type: 'Project', id: 'LIST' }])
        )
      },
    }),

    updateProject: builder.mutation<
      { project: Project },
      { id: string; data: Partial<Project> }
    >({
      query: ({ id, data }) => ({
        url: `projects/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Project']))
      },
    }),

    deleteProject: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `projects/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Project']))
      },
    }),

    getProjectMembers: builder.query<
      { members: ProjectMember[] },
      { projectId: string }
    >({
      query: ({ projectId }) => `projects/${projectId}/members`,
      providesTags: ['ProjectMember'],
    }),

    addProjectMember: builder.mutation<
      { member: ProjectMember },
      { projectId: string; userId: string; roleId: string }
    >({
      query: ({ projectId, ...data }) => ({
        url: `projects/${projectId}/members`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['ProjectMember']))
      },
    }),

    updateProjectMember: builder.mutation<
      { member: ProjectMember },
      { projectId: string; memberId: string; data: Partial<ProjectMember> }
    >({
      query: ({ projectId, memberId, data }) => ({
        url: `projects/${projectId}/members/${memberId}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['ProjectMember']))
      },
    }),

    removeProjectMember: builder.mutation<
      { success: boolean },
      { projectId: string; memberId: string }
    >({
      query: ({ projectId, memberId }) => ({
        url: `projects/${projectId}/members/${memberId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['ProjectMember']))
      },
    }),

    getTasks: builder.query<
      { tasks: Task[] },
      {
        projectId?: string
        status?: string
        assigneeId?: string
        search?: string
        workspaceId?: string
      }
    >({
      query: ({ projectId, status, assigneeId, search, workspaceId }) => {
        const params = new URLSearchParams()
        if (projectId && projectId !== 'all') {
          params.append('projectId', projectId)
        }
        if (workspaceId) params.append('workspaceId', workspaceId)
        if (status) params.append('status', status)
        if (assigneeId) params.append('assigneeId', assigneeId)
        if (search) params.append('search', search)
        return `tasks?${params}`
      },
      providesTags: (result, error, arg) =>
        result
          ? [
              { type: 'Task', id: 'LIST' },
              ...(arg.projectId
                ? [{ type: 'Task' as const, id: `PROJECT_${arg.projectId}` }]
                : []),
              ...(arg.workspaceId
                ? [
                    {
                      type: 'Task' as const,
                      id: `WORKSPACE_${arg.workspaceId}`,
                    },
                  ]
                : []),
              ...result.tasks.map(task => ({
                type: 'Task' as const,
                id: task.id,
              })),
            ]
          : [{ type: 'Task', id: 'LIST' }],
    }),

    createTask: builder.mutation<
      { task: Task },
      Partial<Task> & { projectId: string; workspaceId: string }
    >({
      query: data => ({
        url: 'tasks',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Task', id: 'LIST' },
            { type: 'Task', id: `PROJECT_${arg.projectId}` },
            { type: 'Task', id: `WORKSPACE_${arg.workspaceId}` },
          ])
        )
      },
    }),

    updateTask: builder.mutation<
      { task: Task },
      { id: string; data: Partial<Task> }
    >({
      query: ({ id, data }) => ({
        url: `tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Task', id: 'LIST' },
            { type: 'Task', id },
          ])
        )
      },
    }),

    deleteTask: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `tasks/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Task', id: 'LIST' },
            { type: 'Task', id },
          ])
        )
      },
    }),

    reorderTasks: builder.mutation<
      { success: boolean },
      {
        projectId: string
        tasks: { id: string; status: string; order: number }[]
      }
    >({
      query: ({ projectId, tasks }) => ({
        url: `projects/${projectId}/tasks/reorder`,
        method: 'PUT',
        body: { tasks },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Task']))
      },
    }),

    getDocuments: builder.query<
      { documents: Document[] },
      {
        projectId: string
        type?: string
        search?: string
      }
    >({
      query: ({ projectId, type, search }) => {
        const params = new URLSearchParams({ projectId })
        if (type) params.append('type', type)
        if (search) params.append('search', search)
        return `documents?${params}`
      },
      providesTags: ['Document'],
    }),

    getDocument: builder.query<{ document: Document }, { id: string }>({
      query: ({ id }) => `documents/${id}`,
      providesTags: (result, error, arg) => [{ type: 'Document', id: arg.id }],
    }),

    createDocument: builder.mutation<
      { document: Document },
      Partial<Document> & { projectId: string; workspaceId: string }
    >({
      query: data => {
        const processedData = { ...data }

        if (processedData.tags && Array.isArray(processedData.tags)) {
          processedData.tags = processedData.tags.map((tag: any) =>
            typeof tag === 'string' ? tag : tag.text || String(tag)
          )
        }

        return {
          url: 'documents',
          method: 'POST',
          body: processedData,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Document']))
      },
    }),

    updateDocument: builder.mutation<
      { document: Document },
      { id: string; data: Partial<Document> }
    >({
      query: ({ id, data }) => {
        const processedData = { ...data }

        if (processedData.tags && Array.isArray(processedData.tags)) {
          processedData.tags = processedData.tags.map((tag: any) =>
            typeof tag === 'string' ? tag : tag.text || String(tag)
          )
        }

        return {
          url: `documents/${id}`,
          method: 'PUT',
          body: processedData,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Document']))
      },
    }),

    deleteDocument: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `documents/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Document']))
      },
    }),

    inviteToProject: builder.mutation<
      { invitation: ProjectInvitation },
      {
        projectId: string
        email: string
        roleId: string
        message?: string
      }
    >({
      query: ({ projectId, ...data }) => ({
        url: `projects/${projectId}/invite`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['ProjectInvitation']))
      },
    }),

    getProjectInvitations: builder.query<
      { invitations: ProjectInvitation[] },
      { projectId: string }
    >({
      query: ({ projectId }) => `projects/${projectId}/invitations`,
      providesTags: ['ProjectInvitation'],
    }),

    respondToInvitation: builder.mutation<
      { success: boolean },
      { token: string; action: 'accept' | 'decline' }
    >({
      query: ({ token, action }) => ({
        url: `projects/invitations/${token}/${action}`,
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            'ProjectInvitation',
            'ProjectMember',
          ])
        )
      },
    }),

    requestToJoinProject: builder.mutation<
      { request: ProjectJoinRequest },
      { projectId: string; message?: string }
    >({
      query: ({ projectId, message }) => ({
        url: `projects/${projectId}/join-request`,
        method: 'POST',
        body: { message },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['ProjectJoinRequest']))
      },
    }),

    getJoinRequests: builder.query<
      { requests: ProjectJoinRequest[] },
      { projectId: string }
    >({
      query: ({ projectId }) => `projects/${projectId}/join-requests`,
      providesTags: ['ProjectJoinRequest'],
    }),

    respondToJoinRequest: builder.mutation<
      { success: boolean },
      { requestId: string; action: 'approve' | 'deny' }
    >({
      query: ({ requestId, action }) => ({
        url: `projects/join-requests/${requestId}/${action}`,
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            'ProjectJoinRequest',
            'ProjectMember',
          ])
        )
      },
    }),

    getColumns: builder.query<{ columns: Column[] }, { projectId: string }>({
      query: ({ projectId }) => `columns?projectId=${projectId}`,
      providesTags: ['Column'],
    }),

    createColumn: builder.mutation<
      { column: Column },
      Partial<Column> & { projectId: string }
    >({
      query: data => ({
        url: 'columns',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Column']))
      },
    }),

    updateColumn: builder.mutation<
      { column: Column },
      { id: string; data: Partial<Column> }
    >({
      query: ({ id, data }) => ({
        url: `columns/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Column']))
      },
    }),

    deleteColumn: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `columns/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(projectsApi.util.invalidateTags(['Column']))
      },
    }),

    startTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `tasks/${taskId}/time-tracking/start`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled

          const queries = [
            { projectId: data.task.projectId },
            { workspaceId: data.task.workspaceId },
          ]

          queries.forEach(queryArgs => {
            dispatch(
              projectsApi.util.updateQueryData('getTasks', queryArgs, draft => {
                const taskIndex = draft.tasks.findIndex(t => t.id === taskId)
                if (taskIndex !== -1) {
                  draft.tasks[taskIndex] = data.task
                }
              })
            )
          })

          dispatch(
            projectsApi.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    stopTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `tasks/${taskId}/time-tracking/stop`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            projectsApi.util.updateQueryData(
              'getTasks',
              { projectId: data.task.projectId },
              draft => {
                const taskIndex = draft.tasks.findIndex(t => t.id === taskId)
                if (taskIndex !== -1) {
                  draft.tasks[taskIndex] = data.task
                }
              }
            )
          )

          dispatch(
            projectsApi.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    pauseTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `tasks/${taskId}/time-tracking/pause`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            projectsApi.util.updateQueryData(
              'getTasks',
              { projectId: data.task.projectId },
              draft => {
                const taskIndex = draft.tasks.findIndex(t => t.id === taskId)
                if (taskIndex !== -1) {
                  draft.tasks[taskIndex] = data.task
                }
              }
            )
          )

          dispatch(
            projectsApi.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    resumeTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `tasks/${taskId}/time-tracking/resume`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            projectsApi.util.updateQueryData(
              'getTasks',
              { projectId: data.task.projectId },
              draft => {
                const taskIndex = draft.tasks.findIndex(t => t.id === taskId)
                if (taskIndex !== -1) {
                  draft.tasks[taskIndex] = data.task
                }
              }
            )
          )

          dispatch(
            projectsApi.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    // Sprint endpoints
    getSprints: builder.query<
      { sprints: Sprint[] },
      { projectId: string; status?: string }
    >({
      query: ({ projectId, status }) => {
        const params = new URLSearchParams({ projectId })
        if (status) params.append('status', status)
        return `sprints?${params}`
      },
      providesTags: (result, error, arg) =>
        result
          ? [
              { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
              ...result.sprints.map(sprint => ({
                type: 'Sprint' as const,
                id: sprint.id,
              })),
            ]
          : [{ type: 'Sprint', id: `PROJECT_${arg.projectId}` }],
    }),

    getSprint: builder.query<{ sprint: Sprint }, { id: string }>({
      query: ({ id }) => `sprints/${id}`,
      providesTags: (result, error, arg) => [{ type: 'Sprint', id: arg.id }],
    }),

    createSprint: builder.mutation<
      { sprint: Sprint },
      {
        name: string
        goal?: string
        projectId: string
        startDate: string
        endDate: string
      }
    >({
      query: data => ({
        url: 'sprints',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
          ])
        )
      },
    }),

    updateSprint: builder.mutation<
      { sprint: Sprint },
      { id: string; data: Partial<Sprint> }
    >({
      query: ({ id, data }) => ({
        url: `sprints/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data: result } = await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Sprint', id },
            ...(result
              ? [
                  {
                    type: 'Sprint' as const,
                    id: `PROJECT_${result.sprint.projectId}`,
                  },
                ]
              : []),
          ])
        )
      },
    }),

    deleteSprint: builder.mutation<
      { success: boolean },
      { id: string; projectId: string }
    >({
      query: ({ id }) => ({
        url: `sprints/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Sprint', id: arg.id },
            { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
            { type: 'Task', id: 'LIST' },
          ])
        )
      },
    }),

    startSprint: builder.mutation<
      { sprint: Sprint },
      { id: string; projectId: string }
    >({
      query: ({ id }) => ({
        url: `sprints/${id}/start`,
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Sprint', id: arg.id },
            { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
          ])
        )
      },
    }),

    completeSprint: builder.mutation<
      {
        sprint: Sprint
        summary: {
          completedTasks: number
          movedTasks: number
          moveTarget: string
        }
      },
      { id: string; projectId: string; moveIncompleteTo: string }
    >({
      query: ({ id, moveIncompleteTo }) => ({
        url: `sprints/${id}/complete`,
        method: 'POST',
        body: { moveIncompleteTo },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Sprint', id: arg.id },
            { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
            { type: 'Task', id: 'LIST' },
          ])
        )
      },
    }),

    assignTasksToSprint: builder.mutation<
      { success: boolean; modifiedCount: number },
      {
        sprintId: string
        projectId: string
        taskIds: string[]
        action: 'add' | 'remove'
      }
    >({
      query: ({ sprintId, taskIds, action }) => ({
        url: `sprints/${sprintId}/tasks`,
        method: 'POST',
        body: { taskIds, action },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          projectsApi.util.invalidateTags([
            { type: 'Sprint', id: arg.sprintId },
            { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
            { type: 'Task', id: 'LIST' },
          ])
        )
      },
    }),

    getTags: builder.query<
      {
        tags: {
          id: string
          name: string
          color: string
          description?: string
        }[]
      },
      { workspaceId: string }
    >({
      query: ({ workspaceId }) => ({
        url: `/tags?workspaceId=${workspaceId}`,
        method: 'GET',
      }),
      providesTags: ['Tag'],
    }),
  }),
})

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,

  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useUpdateProjectMemberMutation,
  useRemoveProjectMemberMutation,

  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTasksMutation,

  useStartTimeTrackingMutation,
  useStopTimeTrackingMutation,
  usePauseTimeTrackingMutation,
  useResumeTimeTrackingMutation,

  useGetDocumentsQuery,
  useGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,

  useInviteToProjectMutation,
  useGetProjectInvitationsQuery,
  useRespondToInvitationMutation,
  useRequestToJoinProjectMutation,
  useGetJoinRequestsQuery,
  useRespondToJoinRequestMutation,

  useGetColumnsQuery,
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useDeleteColumnMutation,

  useGetSprintsQuery,
  useGetSprintQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useStartSprintMutation,
  useCompleteSprintMutation,
  useAssignTasksToSprintMutation,

  useGetTagsQuery,
} = projectsApi
