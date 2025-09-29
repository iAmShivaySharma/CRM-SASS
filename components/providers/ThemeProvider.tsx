'use client'

import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { useGetUserPreferencesQuery } from '@/lib/api/userPreferencesApi'
import { loadThemeFromPreferences } from '@/lib/slices/themeSlice'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, customTheme, primaryColor } = useAppSelector(
    state => state.theme
  )
  const dispatch = useAppDispatch()

  // Load theme preferences from server using RTK Query
  const { data: preferences } = useGetUserPreferencesQuery()

  // Load theme from server preferences when available
  useEffect(() => {
    if (preferences?.preferences?.theme) {
      dispatch(loadThemeFromPreferences(preferences.preferences))
    }
  }, [preferences, dispatch])

  useEffect(() => {
    const root = document.documentElement

    // Apply theme mode
    if (mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const applySystemTheme = () => {
        root.classList.toggle('dark', mediaQuery.matches)
      }

      applySystemTheme()
      mediaQuery.addEventListener('change', applySystemTheme)

      return () => mediaQuery.removeEventListener('change', applySystemTheme)
    } else {
      root.classList.toggle('dark', mode === 'dark')
    }
  }, [mode])

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): string => {
    if (!hex || !hex.startsWith('#')) return '0 0% 50%'

    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  useEffect(() => {
    const root = document.documentElement

    // Apply custom theme colors in HSL format for Tailwind CSS
    // Use primaryColor from state if available, otherwise use customTheme.colors.primary
    const effectivePrimaryColor = primaryColor || customTheme.colors.primary
    if (effectivePrimaryColor) {
      const primaryHsl = hexToHsl(effectivePrimaryColor)
      root.style.setProperty('--primary', primaryHsl)
      root.style.setProperty('--theme-primary', primaryHsl)
      root.style.setProperty('--ring', primaryHsl)
    }
    if (customTheme.colors.secondary) {
      const secondaryHsl = hexToHsl(customTheme.colors.secondary)
      root.style.setProperty('--secondary', secondaryHsl)
      root.style.setProperty('--theme-secondary', secondaryHsl)
    }
    if (customTheme.colors.accent) {
      const accentHsl = hexToHsl(customTheme.colors.accent)
      root.style.setProperty('--accent', accentHsl)
      root.style.setProperty('--theme-accent', accentHsl)
    }
    if (customTheme.colors.background) {
      const backgroundHsl = hexToHsl(customTheme.colors.background)
      root.style.setProperty('--background', backgroundHsl)
      root.style.setProperty('--theme-background', backgroundHsl)
    }
    if (customTheme.colors.surface) {
      const surfaceHsl = hexToHsl(customTheme.colors.surface)
      root.style.setProperty('--card', surfaceHsl)
      root.style.setProperty('--theme-surface', surfaceHsl)
    }
    if (customTheme.colors.text) {
      const textHsl = hexToHsl(customTheme.colors.text)
      root.style.setProperty('--foreground', textHsl)
      root.style.setProperty('--theme-text', textHsl)
    }
    if (customTheme.colors.border) {
      const borderHsl = hexToHsl(customTheme.colors.border)
      root.style.setProperty('--border', borderHsl)
      root.style.setProperty('--theme-border', borderHsl)
      root.style.setProperty('--input', borderHsl)
    }
    if (customTheme.colors.success) {
      root.style.setProperty(
        '--theme-success',
        hexToHsl(customTheme.colors.success)
      )
    }
    if (customTheme.colors.warning) {
      root.style.setProperty(
        '--theme-warning',
        hexToHsl(customTheme.colors.warning)
      )
    }
    if (customTheme.colors.error) {
      root.style.setProperty(
        '--theme-error',
        hexToHsl(customTheme.colors.error)
      )
    }

    // Apply typography
    root.style.setProperty('--font-family', customTheme.typography.fontFamily)

    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }
    root.style.setProperty(
      '--base-font-size',
      fontSizeMap[customTheme.typography.fontSize as keyof typeof fontSizeMap]
    )

    // Apply spacing density
    const spacingMap = {
      compact: '0.75',
      comfortable: '1',
      spacious: '1.25',
    }
    root.style.setProperty(
      '--spacing-scale',
      spacingMap[customTheme.spacing.density as keyof typeof spacingMap]
    )

    // Apply border radius
    const borderRadiusMap = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '12px',
    }
    root.style.setProperty(
      '--border-radius',
      borderRadiusMap[customTheme.borderRadius as keyof typeof borderRadiusMap]
    )

    // Apply animations
    root.style.setProperty(
      '--animation-duration',
      customTheme.animations ? '200ms' : '0ms'
    )

    // Apply CSS classes for density
    root.classList.remove(
      'density-compact',
      'density-comfortable',
      'density-spacious'
    )
    root.classList.add(`density-${customTheme.spacing.density}`)

    // Apply CSS classes for animations
    root.classList.toggle('animations-disabled', !customTheme.animations)
  }, [customTheme, primaryColor])

  return <>{children}</>
}

// Theme utility functions
export const getThemeValue = (property: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(
    `--${property}`
  )
}

export const applyThemeToElement = (element: HTMLElement, theme: any) => {
  Object.entries(theme.colors).forEach(([key, value]) => {
    element.style.setProperty(`--${key}`, value as string)
  })
}

// Theme presets for quick switching
export const themePresets = {
  blue: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  green: {
    primary: '#059669',
    secondary: '#64748b',
    accent: '#10b981',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  purple: {
    primary: '#7c3aed',
    secondary: '#64748b',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  orange: {
    primary: '#ea580c',
    secondary: '#64748b',
    accent: '#f97316',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
}

// CSS-in-JS theme object for styled components
export const createThemeObject = (customTheme: any) => ({
  colors: customTheme.colors,
  typography: {
    fontFamily: customTheme.typography.fontFamily,
    fontSize:
      (
        {
          small: '0.875rem',
          medium: '1rem',
          large: '1.125rem',
        } as any
      )[customTheme.typography.fontSize] || '1rem',
  },
  spacing: {
    scale:
      (
        {
          compact: 0.75,
          comfortable: 1,
          spacious: 1.25,
        } as any
      )[customTheme.spacing.density] || 1,
  },
  borderRadius:
    (
      {
        none: '0px',
        small: '4px',
        medium: '8px',
        large: '12px',
      } as any
    )[customTheme.borderRadius] || '8px',
  animations: {
    duration: customTheme.animations ? '200ms' : '0ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
})

// Hook for accessing theme values in components
export const useTheme = () => {
  const theme = useAppSelector(state => state.theme)
  return {
    ...theme,
    themeObject: createThemeObject(theme.customTheme),
  }
}
