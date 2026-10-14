import { api } from './index'

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

const userPreferencesApi = api.injectEndpoints({
  endpoints: builder => ({
    getUserPreferences: builder.query<PreferencesResponse, void>({
      query: () => 'api/users/preferences',
      providesTags: ['UserPreferences'],
    }),
    updateUserPreferences: builder.mutation<
      PreferencesResponse,
      UserPreferences
    >({
      query: preferences => ({
        url: 'api/users/preferences',
        method: 'PUT',
        body: preferences,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['UserPreferences']))
      },
    }),
    patchUserPreferences: builder.mutation<
      PreferencesResponse,
      Partial<UserPreferences>
    >({
      query: preferences => ({
        url: 'api/users/preferences',
        method: 'PATCH',
        body: preferences,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['UserPreferences']))
      },
    }),
  }),
})

export const {
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  usePatchUserPreferencesMutation,
} = userPreferencesApi
