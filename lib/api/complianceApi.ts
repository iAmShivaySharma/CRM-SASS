import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ComplianceTaskRecord {
  _id: string
  id: string
  workspaceId: string
  title: string
  description?: string
  category:
    | 'llp_mca'
    | 'gst'
    | 'tds'
    | 'income_tax'
    | 'fssai'
    | 'trademark'
    | 'banking'
    | 'other'
  dueDate: string
  financialYear: string
  period?: string
  status: 'pending' | 'completed' | 'overdue' | 'not_applicable'
  completedDate?: string
  referenceNumber?: string
  amount?: number
  notes?: string
  reminderDays: number
  isRecurring: boolean
  recurringFrequency?: 'monthly' | 'quarterly' | 'annual'
  portalUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ComplianceDocumentRecord {
  _id: string
  id: string
  workspaceId: string
  name: string
  category:
    | 'license'
    | 'registration'
    | 'filing'
    | 'agreement'
    | 'certificate'
    | 'tax_return'
    | 'audit_report'
    | 'bank'
    | 'dsc'
    | 'other'
  documentNumber?: string
  issuedBy?: string
  issueDate?: string
  expiryDate?: string
  status: 'valid' | 'expiring_soon' | 'expired' | 'archived'
  documentUrl?: string
  retentionYears?: number
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface TasksResponse {
  success: boolean
  tasks: ComplianceTaskRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface DocumentsResponse {
  success: boolean
  documents: ComplianceDocumentRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface TasksQueryParams {
  workspaceId: string
  status?: string
  category?: string
  financialYear?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

interface DocumentsQueryParams {
  workspaceId: string
  category?: string
  status?: string
  page?: number
  limit?: number
}

export const complianceApi = createApi({
  reducerPath: 'complianceApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['ComplianceTask', 'ComplianceDocument'],
  endpoints: builder => ({
    getTasks: builder.query<TasksResponse, TasksQueryParams>({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') searchParams.set(k, String(v))
        })
        return `/compliance/tasks?${searchParams}`
      },
      providesTags: ['ComplianceTask'],
    }),

    createTask: builder.mutation<
      { success: boolean; task: ComplianceTaskRecord },
      Partial<ComplianceTaskRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: '/compliance/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ComplianceTask'],
    }),

    updateTask: builder.mutation<
      { success: boolean; task: ComplianceTaskRecord },
      { id: string; workspaceId: string } & Partial<ComplianceTaskRecord>
    >({
      query: ({ id, ...body }) => ({
        url: `/compliance/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ComplianceTask'],
    }),

    deleteTask: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/compliance/tasks/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ComplianceTask'],
    }),

    getDocuments: builder.query<DocumentsResponse, DocumentsQueryParams>({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') searchParams.set(k, String(v))
        })
        return `/compliance/documents?${searchParams}`
      },
      providesTags: ['ComplianceDocument'],
    }),

    createDocument: builder.mutation<
      { success: boolean; document: ComplianceDocumentRecord },
      Partial<ComplianceDocumentRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: '/compliance/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ComplianceDocument'],
    }),

    updateDocument: builder.mutation<
      { success: boolean; document: ComplianceDocumentRecord },
      { id: string; workspaceId: string } & Partial<ComplianceDocumentRecord>
    >({
      query: ({ id, ...body }) => ({
        url: `/compliance/documents/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ComplianceDocument'],
    }),

    deleteDocument: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/compliance/documents/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ComplianceDocument'],
    }),
  }),
})

export const {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useGetDocumentsQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
} = complianceApi
