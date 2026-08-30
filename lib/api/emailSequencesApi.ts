import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface SequenceStep {
  order: number
  subject: string
  body: string
  delayDays: number
  delayHours: number
}

export interface EmailSequence {
  _id: string
  workspaceId: string
  name: string
  description?: string
  steps: SequenceStep[]
  status: 'active' | 'paused' | 'draft'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SequenceEnrollment {
  _id: string
  sequenceId: string
  leadId?: string
  contactId?: string
  status: string
  currentStep: number
  createdAt: string
}

export interface SequencesResponse {
  success: boolean
  sequences: EmailSequence[]
}

export interface SequenceDetailResponse {
  success: boolean
  sequence: EmailSequence
  enrollments: SequenceEnrollment[]
}

export const emailSequencesApi = createApi({
  reducerPath: 'emailSequencesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['EmailSequence', 'SequenceEnrollment'],
  endpoints: builder => ({
    getSequences: builder.query<SequencesResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/email-sequences?workspaceId=${workspaceId}`,
      providesTags: ['EmailSequence'],
    }),
    getSequence: builder.query<SequenceDetailResponse, string>({
      query: id => `api/email-sequences/${id}`,
      providesTags: (result, error, id) => [{ type: 'EmailSequence', id }],
    }),
    createSequence: builder.mutation<
      { success: boolean; sequence: EmailSequence },
      { workspaceId: string; name: string; description?: string; steps: SequenceStep[] }
    >({
      query: body => ({ url: 'api/email-sequences', method: 'POST', body }),
      invalidatesTags: ['EmailSequence'],
    }),
    updateSequence: builder.mutation<
      { success: boolean; sequence: EmailSequence },
      { id: string; name?: string; description?: string; steps?: SequenceStep[]; status?: string }
    >({
      query: ({ id, ...body }) => ({ url: `api/email-sequences/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'EmailSequence', id }, 'EmailSequence'],
    }),
    deleteSequence: builder.mutation<{ success: boolean; message: string }, string>({
      query: id => ({ url: `api/email-sequences/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmailSequence'],
    }),
    enrollInSequence: builder.mutation<
      { success: boolean; enrollment: SequenceEnrollment },
      { id: string; leadId?: string; contactId?: string; workspaceId: string }
    >({
      query: ({ id, ...body }) => ({ url: `api/email-sequences/${id}/enroll`, method: 'POST', body }),
      invalidatesTags: ['SequenceEnrollment'],
    }),
  }),
})

export const {
  useGetSequencesQuery,
  useGetSequenceQuery,
  useCreateSequenceMutation,
  useUpdateSequenceMutation,
  useDeleteSequenceMutation,
  useEnrollInSequenceMutation,
} = emailSequencesApi
