import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { clearPersistedData } from '../middleware/persistenceMiddleware'

interface User {
  id: string
  email: string
  name: string
  role: string
  workspaceId: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: state => {
      state.loading = true
    },
    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.loading = false
    },
    loginFailure: state => {
      state.loading = false
    },
    logout: state => {
      state.user = null
      state.isAuthenticated = false
      state.loading = false
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
})

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } =
  authSlice.actions
export { authSlice }
export type { AuthState, User }
export default authSlice.reducer
