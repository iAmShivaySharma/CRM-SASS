import { api } from './index'
import { logout } from '@/lib/slices/authSlice'
import { clearPersistedData } from '@/lib/middleware/persistenceMiddleware'

export interface AuthResponse {
  success: boolean
  message: string
  requiresTwoFactor?: boolean
  requiresVerification?: boolean
  user?: any
  workspace?: any
}

export interface LoginRequest {
  email: string
  password: string
  twoFactorToken?: string
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

const authApi = api.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: credentials => ({
        url: 'api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Auth']))
      },
    }),
    signup: builder.mutation<AuthResponse, SignupRequest>({
      query: userData => ({
        url: 'api/auth/signup',
        method: 'POST',
        body: userData,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Auth']))
      },
    }),
    logout: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: 'api/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } catch {
        }
        dispatch(logout())
        dispatch(api.util.invalidateTags(['Auth']))
        clearPersistedData()
      },
    }),
    verify: builder.query<VerifyResponse, void>({
      query: () => ({
        url: 'api/auth/verify',
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
