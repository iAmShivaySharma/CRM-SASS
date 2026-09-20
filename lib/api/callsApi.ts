import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface CallSettingsResponse {
  success: boolean
  settings: {
    _id: string
    workspaceId: string
    provider: 'telecmi' | 'exotel' | 'custom'
    apiKey: string
    apiSecret: string
    callerId: string
    webhookUrl?: string
    isActive: boolean
    createdBy: string
    createdAt: string
    updatedAt: string
  } | null
}

export interface CallLog {
  _id: string
  workspaceId: string
  caller: string
  recipient: string
  duration: number
  status: 'completed' | 'missed' | 'failed' | 'ringing'
  callId?: string
  direction: 'outbound' | 'inbound'
  createdAt: string
}

export interface CallLogsResponse {
  success: boolean
  logs: CallLog[]
}

export interface InitiateCallResponse {
  success: boolean
  callId?: string
  message?: string
}

export const callsApi = createApi({
  reducerPath: 'callsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['CallSettings', 'CallLog'],
  endpoints: builder => ({
    getCallSettings: builder.query<
      CallSettingsResponse,
      { workspaceId: string }
    >({
      query: ({ workspaceId }) =>
        `api/calls/settings?workspaceId=${workspaceId}`,
      providesTags: ['CallSettings'],
    }),
    saveCallSettings: builder.mutation<
      CallSettingsResponse,
      {
        workspaceId: string
        provider: string
        apiKey: string
        apiSecret: string
        callerId: string
        webhookUrl?: string
      }
    >({
      query: body => ({
        url: 'api/calls/settings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CallSettings'],
    }),
    initiateCall: builder.mutation<
      InitiateCallResponse,
      { workspaceId: string; to: string; from?: string }
    >({
      query: body => ({
        url: 'api/calls/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CallLog'],
    }),
    getCallLogs: builder.query<CallLogsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/calls/logs?workspaceId=${workspaceId}`,
      providesTags: ['CallLog'],
    }),
  }),
})

export const {
  useGetCallSettingsQuery,
  useSaveCallSettingsMutation,
  useInitiateCallMutation,
  useGetCallLogsQuery,
} = callsApi
