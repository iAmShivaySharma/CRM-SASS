import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface AuthResponse {
  success: boolean
  message: string
  user?: any
  workspace?: any
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  name: string
  email: string
  password: string
  workspaceName: string
}

export interface VerifyResponse {
  valid: boolean
  user?: any
  workspace?: any
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/auth',
    credentials: 'include', // Include cookies for authentication
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Auth'],
  endpoints: builder => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: credentials => ({
        url: 'login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    signup: builder.mutation<AuthResponse, SignupRequest>({
      query: userData => ({
        url: 'signup',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: 'logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    verify: builder.query<VerifyResponse, void>({
      query: () => ({
        url: 'verify',
        method: 'POST',
      }),
      providesTags: ['Auth'],
    }),
  }),
})

export const {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useVerifyQuery,
} = authApi
