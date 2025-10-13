import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface UserPreferences {
  theme?: {
    mode?: 'light' | 'dark' | 'auto'
    primaryColor?: string
    preset?: string
    customTheme?: {
      colors?: {
        primary?: string
        secondary?: string
        accent?: string
        background?: string
        surface?: string
        text?: string
        border?: string
        success?: string
        warning?: string
        error?: string
      }
      typography?: {
        fontFamily?: string
        fontSize?: 'small' | 'medium' | 'large'
      }
      spacing?: {
        density?: 'compact' | 'comfortable' | 'spacious'
      }
      borderRadius?: 'none' | 'small' | 'medium' | 'large'
      animations?: boolean
    }
  }
  notifications?: {
    email?: boolean
    push?: boolean
    leadUpdates?: boolean
    teamActivity?: boolean
    weeklyReports?: boolean
  }
  workspace?: {
    selectedProjectId?: string
    lastActiveProjectId?: string
  }
  timezone?: string
  language?: string
  updatedAt?: Date
}

export interface PreferencesResponse {
  success: boolean
  preferences: UserPreferences
  message?: string
}

export const userPreferencesApi = createApi({
  reducerPath: 'userPreferencesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/users/preferences',
    credentials: 'include', // Use cookies instead of Authorization header
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['UserPreferences'],
  endpoints: builder => ({
    getUserPreferences: builder.query<PreferencesResponse, void>({
      query: () => '',
      providesTags: ['UserPreferences'],
    }),
    updateUserPreferences: builder.mutation<
      PreferencesResponse,
      UserPreferences
    >({
      query: preferences => ({
        url: '',
        method: 'PUT',
        body: preferences,
      }),
      invalidatesTags: ['UserPreferences'],
    }),
    patchUserPreferences: builder.mutation<
      PreferencesResponse,
      Partial<UserPreferences>
    >({
      query: preferences => ({
        url: '',
        method: 'PATCH',
        body: preferences,
      }),
      invalidatesTags: ['UserPreferences'],
    }),
  }),
})

export const {
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  usePatchUserPreferencesMutation,
} = userPreferencesApi
