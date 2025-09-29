import { Middleware } from '@reduxjs/toolkit'

// Keys to persist in localStorage
const PERSIST_KEYS = {
  theme: 'crm_theme_preferences',
  auth: 'crm_auth_state',
}

// Actions that should trigger persistence
const PERSIST_ACTIONS = [
  'theme/setThemeMode',
  'theme/setPrimaryColor',
  'theme/setPreset',
  'theme/updateCustomTheme',
  'theme/updateThemeColors',
  'theme/updateTypography',
  'theme/updateSpacing',
  'theme/setBorderRadius',
  'theme/toggleAnimations',
  'theme/toggleSidebar',
  'auth/loginSuccess',
  'auth/logout',
]

// Load persisted state from localStorage (client-side only)
export const loadPersistedState = () => {
  // Prevent hydration mismatch by only loading on client
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const persistedState: any = {}

    // Load theme state
    const themeState = localStorage.getItem(PERSIST_KEYS.theme)
    if (themeState) {
      persistedState.theme = JSON.parse(themeState)
    }

    // Load auth state (only basic info, not sensitive data)
    const authState = localStorage.getItem(PERSIST_KEYS.auth)
    if (authState) {
      const parsed = JSON.parse(authState)
      persistedState.auth = {
        isAuthenticated: parsed.isAuthenticated || false,
        user: parsed.user || null,
        loading: false,
        error: null,
      }
    }

    return persistedState
  } catch (error) {
    console.error('Error loading persisted state:', error)
    return {}
  }
}

// Save state to localStorage (client-side only)
const saveToLocalStorage = (key: string, state: any) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

// Persistence middleware
export const persistenceMiddleware: Middleware =
  store => next => (action: any) => {
    const result = next(action)

    // Check if this action should trigger persistence
    if (action.type && PERSIST_ACTIONS.includes(action.type)) {
      const state = store.getState()

      switch (action.type.split('/')[0]) {
        case 'theme':
          saveToLocalStorage(PERSIST_KEYS.theme, state.theme)
          break
        case 'auth':
          // Only persist non-sensitive auth data (no token)
          const authData = {
            isAuthenticated: state.auth.isAuthenticated,
            user: state.auth.user,
          }
          saveToLocalStorage(PERSIST_KEYS.auth, authData)
          break
      }
    }

    return result
  }

// Clear persisted data (useful for logout)
export const clearPersistedData = () => {
  if (typeof window === 'undefined') return

  try {
    Object.values(PERSIST_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Error clearing persisted data:', error)
  }
}
