import { api } from './index'

export type SequenceChannel = 'email' | 'whatsapp' | 'sms' | 'ai_reply'

export interface SequenceStep {
  order: number
  channel: SequenceChannel
  subject?: string
  body: string
  delayDays: number
  delayHours: number
  aiTone?: 'professional' | 'friendly' | 'casual'
  aiContext?: string
  replyViaChannel?: 'email' | 'whatsapp' | 'sms'
}

export interface EmailSequence {
  id: string
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
  id: string
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

const emailSequencesApi = api.injectEndpoints({
  endpoints: builder => ({
    getSequences: builder.query<SequencesResponse, { workspaceId: string }>({
      query: ({ workspaceId }) =>
        `api/email-sequences?workspaceId=${workspaceId}`,
      providesTags: ['EmailSequence'],
    }),
    getSequence: builder.query<SequenceDetailResponse, string>({
      query: id => `api/email-sequences/${id}`,
      providesTags: (result, error, id) => [{ type: 'EmailSequence', id }],
    }),
    createSequence: builder.mutation<
      { success: boolean; sequence: EmailSequence },
      {
        workspaceId: string
        name: string
        description?: string
        steps: SequenceStep[]
      }
    >({
      query: body => ({ url: 'api/email-sequences', method: 'POST', body }),
      invalidatesTags: ['EmailSequence'],
    }),
    updateSequence: builder.mutation<
      { success: boolean; sequence: EmailSequence },
      {
        id: string
        name?: string
        description?: string
        steps?: SequenceStep[]
        status?: string
      }
    >({
      query: ({ id, ...body }) => ({
        url: `api/email-sequences/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'EmailSequence', id },
        'EmailSequence',
      ],
    }),
    deleteSequence: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({ url: `api/email-sequences/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmailSequence'],
    }),
    enrollInSequence: builder.mutation<
      { success: boolean; enrollment: SequenceEnrollment },
      { id: string; leadId?: string; contactId?: string; workspaceId: string }
    >({
      query: ({ id, ...body }) => ({
        url: `api/email-sequences/${id}/enroll`,
        method: 'POST',
        body,
      }),
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
