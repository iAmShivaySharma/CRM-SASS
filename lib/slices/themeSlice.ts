import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ThemePreset {
  id: string
  name: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  borderColor: string
}

export interface CustomTheme {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    border: string
    success: string
    warning: string
    error: string
  }
  typography: {
    fontFamily: string
    fontSize: 'small' | 'medium' | 'large'
  }
  spacing: {
    density: 'compact' | 'comfortable' | 'spacious'
  }
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  animations: boolean
}

interface ThemeState {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  sidebarCollapsed: boolean
  preset: string
  customTheme: CustomTheme
  presets: ThemePreset[]
}

const defaultPresets: ThemePreset[] = [
  {
    id: 'blue',
    name: 'Ocean Blue',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    accentColor: '#0ea5e9',
    backgroundColor: '#ffffff',
    surfaceColor: '#f8fafc',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
  },
  {
    id: 'green',
    name: 'Forest Green',
    primaryColor: '#059669',
    secondaryColor: '#64748b',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    surfaceColor: '#f0fdf4',
    textColor: '#1e293b',
    borderColor: '#dcfce7',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    primaryColor: '#7c3aed',
    secondaryColor: '#64748b',
    accentColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    surfaceColor: '#faf5ff',
    textColor: '#1e293b',
    borderColor: '#e9d5ff',
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    primaryColor: '#ea580c',
    secondaryColor: '#64748b',
    accentColor: '#f97316',
    backgroundColor: '#ffffff',
    surfaceColor: '#fff7ed',
    textColor: '#1e293b',
    borderColor: '#fed7aa',
  },
]

const initialState: ThemeState = {
  mode: 'light',
  primaryColor: '#2563eb',
  sidebarCollapsed: false, // Sidebar expanded by default
  preset: 'blue',
  presets: defaultPresets,
  customTheme: {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 'medium',
    },
    spacing: {
      density: 'comfortable',
    },
    borderRadius: 'medium',
    animations: true,
  },
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: state => {
      if (state.mode === 'light') {
        state.mode = 'dark'
      } else if (state.mode === 'dark') {
        state.mode = 'auto'
      } else {
        state.mode = 'light'
      }
    },
    setThemeMode: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.mode = action.payload
    },
    setPrimaryColor: (state, action: PayloadAction<string>) => {
      state.primaryColor = action.payload
      state.customTheme.colors.primary = action.payload
    },
    setPreset: (state, action: PayloadAction<string>) => {
      state.preset = action.payload
      const preset = state.presets.find(p => p.id === action.payload)
      if (preset) {
        state.primaryColor = preset.primaryColor
        state.customTheme.colors.primary = preset.primaryColor
        state.customTheme.colors.secondary = preset.secondaryColor
        state.customTheme.colors.accent = preset.accentColor
        state.customTheme.colors.background = preset.backgroundColor
        state.customTheme.colors.surface = preset.surfaceColor
        state.customTheme.colors.text = preset.textColor
        state.customTheme.colors.border = preset.borderColor
      }
    },
    updateCustomTheme: (state, action: PayloadAction<Partial<CustomTheme>>) => {
      state.customTheme = { ...state.customTheme, ...action.payload }
      state.preset = 'custom'
    },
    updateThemeColors: (
      state,
      action: PayloadAction<Partial<CustomTheme['colors']>>
    ) => {
      state.customTheme.colors = {
        ...state.customTheme.colors,
        ...action.payload,
      }
      state.preset = 'custom'
    },
    updateTypography: (
      state,
      action: PayloadAction<Partial<CustomTheme['typography']>>
    ) => {
      state.customTheme.typography = {
        ...state.customTheme.typography,
        ...action.payload,
      }
    },
    updateSpacing: (
      state,
      action: PayloadAction<Partial<CustomTheme['spacing']>>
    ) => {
      state.customTheme.spacing = {
        ...state.customTheme.spacing,
        ...action.payload,
      }
    },
    setBorderRadius: (
      state,
      action: PayloadAction<CustomTheme['borderRadius']>
    ) => {
      state.customTheme.borderRadius = action.payload
    },
    toggleAnimations: state => {
      state.customTheme.animations = !state.customTheme.animations
    },
    toggleSidebar: state => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    addCustomPreset: (state, action: PayloadAction<ThemePreset>) => {
      state.presets.push(action.payload)
    },
    removeCustomPreset: (state, action: PayloadAction<string>) => {
      state.presets = state.presets.filter(p => p.id !== action.payload)
    },
    resetTheme: state => {
      state.mode = 'light'
      state.preset = 'blue'
      state.primaryColor = '#2563eb'
      state.customTheme = initialState.customTheme
    },
    loadThemeFromPreferences: (state, action: PayloadAction<any>) => {
      const preferences = action.payload
      if (preferences.theme) {
        if (preferences.theme.mode) state.mode = preferences.theme.mode
        if (preferences.theme.primaryColor)
          state.primaryColor = preferences.theme.primaryColor
        if (preferences.theme.preset) state.preset = preferences.theme.preset
        if (preferences.theme.customTheme) {
          state.customTheme = {
            ...state.customTheme,
            ...preferences.theme.customTheme,
          }
        }
      }
    },
  },
})

export const {
  toggleTheme,
  setThemeMode,
  setPrimaryColor,
  setPreset,
  updateCustomTheme,
  updateThemeColors,
  updateTypography,
  updateSpacing,
  setBorderRadius,
  toggleAnimations,
  toggleSidebar,
  addCustomPreset,
  removeCustomPreset,
  resetTheme,
  loadThemeFromPreferences,
} = themeSlice.actions

export { themeSlice }
export default themeSlice.reducer
