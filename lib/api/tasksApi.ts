import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Task {
  id: string
  _id: string
  title: string
  description?: string
  projectId: string
  workspaceId: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  assignee?: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  tags?: string[]
  dueDate?: string
  estimatedHours?: number
  order: number
  dependencies?: string[]
  customFields?: Record<string, any>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface TasksResponse {
  tasks: Task[]
}

export interface CreateTaskRequest {
  title: string
  description?: string
  projectId: string
  status?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  tags?: string[]
  dueDate?: string
  estimatedHours?: number
  dependencies?: string[]
  customFields?: Record<string, any>
}

export interface UpdateTaskRequest {
  id: string
  title?: string
  description?: string
  status?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  tags?: string[]
  dueDate?: string
  estimatedHours?: number
  order?: number
  dependencies?: string[]
  customFields?: Record<string, any>
}

export interface GetTasksRequest {
  projectId: string
  status?: string
  assigneeId?: string
  search?: string
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/tasks',
    credentials: 'include',
  }),
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasks: builder.query<TasksResponse, GetTasksRequest>({
      query: ({ projectId, status, assigneeId, search }) => {
        const params = new URLSearchParams()
        params.append('projectId', projectId)
        if (status) params.append('status', status)
        if (assigneeId) params.append('assigneeId', assigneeId)
        if (search) params.append('search', search)

        return `?${params.toString()}`
      },
      providesTags: ['Task'],
    }),
    getTask: builder.query<{ task: Task }, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<{ task: Task }, CreateTaskRequest>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<{ task: Task }, UpdateTaskRequest>({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
    deleteTask: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Task', id }, 'Task'],
    }),
  }),
})

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi