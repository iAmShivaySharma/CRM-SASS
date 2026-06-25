import { type Middleware } from '@reduxjs/toolkit'

const PERSIST_KEYS = {
  theme: 'crm_theme_preferences',
  auth: 'crm_auth_state',
}

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
  'theme/loadThemeFromPreferences',
  'auth/loginSuccess',
  'auth/logout',
]

export const loadPersistedState = () => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const persistedState: any = {}

    const themeState = localStorage.getItem(PERSIST_KEYS.theme)
    if (themeState) {
      persistedState.theme = JSON.parse(themeState)
    }

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
    return {}
  }
}

const saveToLocalStorage = (key: string, state: any) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch (error) {}
}

export const persistenceMiddleware: Middleware =
  store => next => (action: any) => {
    const result = next(action)

    if (action.type && PERSIST_ACTIONS.includes(action.type)) {
      const state = store.getState()

      switch (action.type.split('/')[0]) {
        case 'theme':
          saveToLocalStorage(PERSIST_KEYS.theme, state.theme)
          break
        case 'auth':
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

export const clearPersistedData = () => {
  if (typeof window === 'undefined') return

  try {
    Object.values(PERSIST_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {}
}
