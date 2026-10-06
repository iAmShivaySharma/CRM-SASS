import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const createBaseQuery = (basePath: string = '') =>
  fetchBaseQuery({
    baseUrl: `${API_URL}${basePath || '/'}`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      return headers
    },
  })
