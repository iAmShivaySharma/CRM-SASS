import { api } from './index'

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

const projectsApi = api.injectEndpoints({
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
        return `api/projects?${params}`
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
      query: ({ id }) => `api/projects/${id}`,
      providesTags: ['Project'],
    }),

    createProject: builder.mutation<
      { project: Project },
      Partial<Project> & { workspaceId: string }
    >({
      query: data => ({
        url: 'api/projects',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([{ type: 'Project', id: 'LIST' }])
        )
      },
    }),

    updateProject: builder.mutation<
      { project: Project },
      { id: string; data: Partial<Project> }
    >({
      query: ({ id, data }) => ({
        url: `api/projects/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Project']))
      },
    }),

    deleteProject: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `api/projects/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Project']))
      },
    }),

    getProjectMembersInProject: builder.query<
      { members: ProjectMember[] },
      { projectId: string }
    >({
      query: ({ projectId }) => `api/projects/${projectId}/members`,
      providesTags: ['ProjectMember'],
    }),

    addProjectMemberInProject: builder.mutation<
      { member: ProjectMember },
      { projectId: string; userId: string; roleId: string }
    >({
      query: ({ projectId, ...data }) => ({
        url: `api/projects/${projectId}/members`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ProjectMember']))
      },
    }),

    updateProjectMember: builder.mutation<
      { member: ProjectMember },
      { projectId: string; memberId: string; data: Partial<ProjectMember> }
    >({
      query: ({ projectId, memberId, data }) => ({
        url: `api/projects/${projectId}/members/${memberId}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ProjectMember']))
      },
    }),

    removeProjectMemberInProject: builder.mutation<
      { success: boolean },
      { projectId: string; memberId: string }
    >({
      query: ({ projectId, memberId }) => ({
        url: `api/projects/${projectId}/members/${memberId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ProjectMember']))
      },
    }),

    getProjectTasks: builder.query<
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
        return `api/tasks?${params}`
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

    createProjectTask: builder.mutation<
      { task: Task },
      Partial<Task> & { projectId: string; workspaceId: string }
    >({
      query: data => ({
        url: 'api/tasks',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
            { type: 'Task', id: 'LIST' },
            { type: 'Task', id: `PROJECT_${arg.projectId}` },
            { type: 'Task', id: `WORKSPACE_${arg.workspaceId}` },
          ])
        )
      },
    }),

    updateProjectTask: builder.mutation<
      { task: Task },
      { id: string; data: Partial<Task> }
    >({
      query: ({ id, data }) => ({
        url: `api/tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
            { type: 'Task', id: 'LIST' },
            { type: 'Task', id },
          ])
        )
      },
    }),

    deleteProjectTask: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `api/tasks/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/projects/${projectId}/tasks/reorder`,
        method: 'PUT',
        body: { tasks },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Task']))
      },
    }),

    getProjectDocuments: builder.query<
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
        return `api/documents?${params}`
      },
      providesTags: ['Document'],
    }),

    getProjectDocument: builder.query<{ document: Document }, { id: string }>({
      query: ({ id }) => `api/documents/${id}`,
      providesTags: (result, error, arg) => [{ type: 'Document', id: arg.id }],
    }),

    createProjectDocument: builder.mutation<
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
          url: 'api/documents',
          method: 'POST',
          body: processedData,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Document']))
      },
    }),

    updateProjectDocument: builder.mutation<
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
          url: `api/documents/${id}`,
          method: 'PUT',
          body: processedData,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Document']))
      },
    }),

    deleteProjectDocument: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `api/documents/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Document']))
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
        url: `api/projects/${projectId}/invite`,
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ProjectInvitation']))
      },
    }),

    getProjectInvitations: builder.query<
      { invitations: ProjectInvitation[] },
      { projectId: string }
    >({
      query: ({ projectId }) => `api/projects/${projectId}/invitations`,
      providesTags: ['ProjectInvitation'],
    }),

    respondToInvitation: builder.mutation<
      { success: boolean },
      { token: string; action: 'accept' | 'decline' }
    >({
      query: ({ token, action }) => ({
        url: `api/projects/invitations/${token}/${action}`,
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/projects/${projectId}/join-request`,
        method: 'POST',
        body: { message },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ProjectJoinRequest']))
      },
    }),

    getJoinRequests: builder.query<
      { requests: ProjectJoinRequest[] },
      { projectId: string }
    >({
      query: ({ projectId }) => `api/projects/${projectId}/join-requests`,
      providesTags: ['ProjectJoinRequest'],
    }),

    respondToJoinRequest: builder.mutation<
      { success: boolean },
      { requestId: string; action: 'approve' | 'deny' }
    >({
      query: ({ requestId, action }) => ({
        url: `api/projects/join-requests/${requestId}/${action}`,
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
            'ProjectJoinRequest',
            'ProjectMember',
          ])
        )
      },
    }),

    getColumns: builder.query<{ columns: Column[] }, { projectId: string }>({
      query: ({ projectId }) => `api/columns?projectId=${projectId}`,
      providesTags: ['Column'],
    }),

    createColumn: builder.mutation<
      { column: Column },
      Partial<Column> & { projectId: string }
    >({
      query: data => ({
        url: 'api/columns',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Column']))
      },
    }),

    updateColumn: builder.mutation<
      { column: Column },
      { id: string; data: Partial<Column> }
    >({
      query: ({ id, data }) => ({
        url: `api/columns/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Column']))
      },
    }),

    deleteColumn: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `api/columns/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Column']))
      },
    }),

    startTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `api/tasks/${taskId}/time-tracking/start`,
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
              projectsApi.util.updateQueryData('getProjectTasks', queryArgs, draft => {
                const taskIndex = draft.tasks.findIndex(t => t.id === taskId)
                if (taskIndex !== -1) {
                  draft.tasks[taskIndex] = data.task
                }
              })
            )
          })

          dispatch(
            api.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    stopTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `api/tasks/${taskId}/time-tracking/stop`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            projectsApi.util.updateQueryData(
              'getProjectTasks',
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
            api.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    pauseTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `api/tasks/${taskId}/time-tracking/pause`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            projectsApi.util.updateQueryData(
              'getProjectTasks',
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
            api.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    resumeTimeTracking: builder.mutation<{ task: Task }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `api/tasks/${taskId}/time-tracking/resume`,
        method: 'POST',
      }),
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            projectsApi.util.updateQueryData(
              'getProjectTasks',
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
            api.util.invalidateTags([
              { type: 'Task', id: 'LIST' },
              { type: 'Task', id: taskId },
            ])
          )
        } catch {}
      },
    }),

    getSprints: builder.query<
      { sprints: Sprint[] },
      { projectId: string; status?: string }
    >({
      query: ({ projectId, status }) => {
        const params = new URLSearchParams({ projectId })
        if (status) params.append('status', status)
        return `api/sprints?${params}`
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
      query: ({ id }) => `api/sprints/${id}`,
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
        url: 'api/sprints',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/sprints/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data: result } = await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/sprints/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/sprints/${id}/start`,
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/sprints/${id}/complete`,
        method: 'POST',
        body: { moveIncompleteTo },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: `api/sprints/${sprintId}/tasks`,
        method: 'POST',
        body: { taskIds, action },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
            { type: 'Sprint', id: arg.sprintId },
            { type: 'Sprint', id: `PROJECT_${arg.projectId}` },
            { type: 'Task', id: 'LIST' },
          ])
        )
      },
    }),

    getProjectTags: builder.query<
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
        url: `api/tags?workspaceId=${workspaceId}`,
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

  useGetProjectMembersInProjectQuery,
  useAddProjectMemberInProjectMutation,
  useUpdateProjectMemberMutation,
  useRemoveProjectMemberInProjectMutation,

  useGetProjectTasksQuery,
  useCreateProjectTaskMutation,
  useUpdateProjectTaskMutation,
  useDeleteProjectTaskMutation,
  useReorderTasksMutation,

  useStartTimeTrackingMutation,
  useStopTimeTrackingMutation,
  usePauseTimeTrackingMutation,
  useResumeTimeTrackingMutation,

  useGetProjectDocumentsQuery,
  useGetProjectDocumentQuery,
  useCreateProjectDocumentMutation,
  useUpdateProjectDocumentMutation,
  useDeleteProjectDocumentMutation,

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

  useGetProjectTagsQuery,
} = projectsApi
