import { api } from './index'

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

const complianceApi = api.injectEndpoints({
  endpoints: builder => ({
    getComplianceTasks: builder.query<TasksResponse, TasksQueryParams>({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') searchParams.set(k, String(v))
        })
        return `api/compliance/tasks?${searchParams}`
      },
      providesTags: ['ComplianceTask'],
    }),

    createComplianceTask: builder.mutation<
      { success: boolean; task: ComplianceTaskRecord },
      Partial<ComplianceTaskRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/compliance/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ComplianceTask'],
    }),

    updateComplianceTask: builder.mutation<
      { success: boolean; task: ComplianceTaskRecord },
      { id: string; workspaceId: string } & Partial<ComplianceTaskRecord>
    >({
      query: ({ id, ...body }) => ({
        url: `api/compliance/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ComplianceTask'],
    }),

    deleteComplianceTask: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/compliance/tasks/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ComplianceTask'],
    }),

    getComplianceDocuments: builder.query<DocumentsResponse, DocumentsQueryParams>({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') searchParams.set(k, String(v))
        })
        return `api/compliance/documents?${searchParams}`
      },
      providesTags: ['ComplianceDocument'],
    }),

    createComplianceDocument: builder.mutation<
      { success: boolean; document: ComplianceDocumentRecord },
      Partial<ComplianceDocumentRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/compliance/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ComplianceDocument'],
    }),

    updateComplianceDocument: builder.mutation<
      { success: boolean; document: ComplianceDocumentRecord },
      { id: string; workspaceId: string } & Partial<ComplianceDocumentRecord>
    >({
      query: ({ id, ...body }) => ({
        url: `api/compliance/documents/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ComplianceDocument'],
    }),

    deleteComplianceDocument: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/compliance/documents/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ComplianceDocument'],
    }),
  }),
})

export const {
  useGetComplianceTasksQuery,
  useCreateComplianceTaskMutation,
  useUpdateComplianceTaskMutation,
  useDeleteComplianceTaskMutation,
  useGetComplianceDocumentsQuery,
  useCreateComplianceDocumentMutation,
  useUpdateComplianceDocumentMutation,
  useDeleteComplianceDocumentMutation,
} = complianceApi
