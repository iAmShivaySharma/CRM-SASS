import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const createBaseQuery = (basePath: string = '') =>
  fetchBaseQuery({
    baseUrl: `${API_URL}${basePath || '/'}`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json')
      const workspaceId = (getState() as any).workspace?.currentWorkspace?.id
      if (workspaceId && !headers.has('x-workspace-id')) {
        headers.set('x-workspace-id', workspaceId)
      }
      return headers
    },
  })
