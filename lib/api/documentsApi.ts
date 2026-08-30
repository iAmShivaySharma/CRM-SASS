import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface ProjectDocument {
  _id: string
  id: string
  title: string
  content: string
  projectId: string
  workspaceId: string
  folderId?: string
  type: 'document' | 'template' | 'note'
  status: 'draft' | 'published' | 'archived'
  visibility: 'private' | 'project' | 'workspace'
  tags?: string[]
  createdBy: { _id: string; fullName: string; email: string }
  lastEditedBy?: { _id: string; fullName: string; email: string }
  lastEditedAt?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentsResponse {
  documents: ProjectDocument[]
}

export interface DocumentResponse {
  document: ProjectDocument
}

export interface CreateDocumentBody {
  title: string
  content: string
  projectId: string
  folderId?: string
  type?: 'document' | 'template' | 'note'
  status?: 'draft' | 'published' | 'archived'
  visibility?: 'private' | 'project' | 'workspace'
  tags?: string[]
}

export const documentsApi = createApi({
  reducerPath: 'documentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['Document'],
  endpoints: builder => ({
    getDocuments: builder.query<
      DocumentsResponse,
      { projectId: string; type?: string; search?: string }
    >({
      query: ({ projectId, type, search }) => {
        const params = new URLSearchParams({ projectId })
        if (type) params.set('type', type)
        if (search) params.set('search', search)
        return `api/documents?${params.toString()}`
      },
      providesTags: (result, error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
    getDocument: builder.query<DocumentResponse, string>({
      query: id => `api/documents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Document', id }],
    }),
    createDocument: builder.mutation<DocumentResponse, CreateDocumentBody>({
      query: body => ({ url: 'api/documents', method: 'POST', body }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Document', id: projectId }],
    }),
    updateDocument: builder.mutation<DocumentResponse, { id: string } & Partial<CreateDocumentBody>>({
      query: ({ id, ...body }) => ({ url: `api/documents/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
    deleteDocument: builder.mutation<{ success: boolean; message: string }, string>({
      query: id => ({ url: `api/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Document'],
    }),
  }),
})

export const {
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
} = documentsApi
