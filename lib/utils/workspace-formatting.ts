/**
 * Workspace-specific formatting utilities
 * Handles currency, date, and time formatting based on workspace settings
 */

import { format, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { useAppSelector } from '@/lib/hooks'
import { useMemo } from 'react'

export interface WorkspaceSettings {
  currency: string
  timezone: string
  settings: {
    dateFormat: string
    timeFormat: string
    weekStartsOn: number
    language: string
  }
}

/**
 * Hook to get current workspace formatting settings
 */
export function useWorkspaceFormatting() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const workspaceSettings: WorkspaceSettings = useMemo(() => {
    if (!currentWorkspace) {
      return {
        currency: 'USD',
        timezone: 'UTC',
        settings: {
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          weekStartsOn: 0,
          language: 'en',
        },
      }
    }

    return {
      currency: currentWorkspace.currency || 'USD',
      timezone: currentWorkspace.timezone || 'UTC',
      settings: {
        dateFormat: currentWorkspace.settings?.dateFormat || 'MM/DD/YYYY',
        timeFormat: currentWorkspace.settings?.timeFormat || '12h',
        weekStartsOn: currentWorkspace.settings?.weekStartsOn ?? 0,
        language: currentWorkspace.settings?.language || 'en',
      },
    }
  }, [currentWorkspace])

  return useMemo(
    () => ({
      // Currency formatting
      formatCurrency: (
        amount: number,
        options?: {
          showSymbol?: boolean
          showCode?: boolean
          compact?: boolean
        }
      ) => formatCurrency(amount, workspaceSettings, options),

      getCurrencySymbol: () =>
        CURRENCY_SYMBOLS[workspaceSettings.currency] ||
        workspaceSettings.currency,

      getCurrencyCode: () => workspaceSettings.currency,

      // Date formatting
      formatDate: (
        date: Date | string,
        options?: { includeTime?: boolean; relative?: boolean }
      ) => formatDate(date, workspaceSettings, options),

      formatTime: (date: Date | string) => formatTime(date, workspaceSettings),

      formatDateTime: (date: Date | string) =>
        formatDate(date, workspaceSettings, { includeTime: true }),

      formatRelativeTime: (date: Date | string) =>
        formatDate(date, workspaceSettings, { relative: true }),

      // Time ago formatting
      getTimeAgo: (dateString: string) => {
        const now = new Date()
        const date = new Date(dateString)

        // Validate the date
        if (!date || isNaN(date.getTime()) || !dateString) {
          return 'Unknown time'
        }

        const diffInMinutes = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60)
        )

        if (diffInMinutes < 1) return 'Just now'
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
        if (diffInMinutes < 1440)
          return `${Math.floor(diffInMinutes / 60)}h ago`

        const diffInDays = Math.floor(diffInMinutes / 1440)
        if (diffInDays < 7) return `${diffInDays}d ago`

        return formatDate(date, workspaceSettings)
      },

      // Number formatting
      formatNumber: (
        number: number,
        options?: { decimals?: number; compact?: boolean }
      ) => formatNumber(number, workspaceSettings, options),

      formatPercentage: (value: number, decimals: number = 1) =>
        `${formatNumber(value, workspaceSettings, { decimals })}%`,

      // Settings access
      getSettings: () => workspaceSettings,
      getTimezone: () => workspaceSettings.timezone,
      getDateFormat: () => workspaceSettings.settings.dateFormat,
      getTimeFormat: () => workspaceSettings.settings.timeFormat,
    }),
    [workspaceSettings]
  )
}

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  SEK: 'kr',
  NZD: 'NZ$',
  MXN: '$',
  SGD: 'S$',
  HKD: 'HK$',
  NOK: 'kr',
  TRY: '₺',
  RUB: '₽',
  INR: '₹',
  BRL: 'R$',
  ZAR: 'R',
  KRW: '₩',
}

// Currency decimal places
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  default: 2,
}

/**
 * Format currency based on workspace settings
 */
export function formatCurrency(
  amount: number,
  workspaceSettings: WorkspaceSettings,
  options: {
    showSymbol?: boolean
    showCode?: boolean
    compact?: boolean
  } = {}
): string {
  const { currency } = workspaceSettings
  const { showSymbol = true, showCode = false, compact = false } = options

  const decimals = CURRENCY_DECIMALS[currency] ?? CURRENCY_DECIMALS.default
  const symbol = CURRENCY_SYMBOLS[currency] || currency

  // Format the number
  let formattedAmount: string

  if (compact && Math.abs(amount) >= 1000) {
    // Compact format for large numbers
    if (Math.abs(amount) >= 1000000) {
      formattedAmount = (amount / 1000000).toFixed(1) + 'M'
    } else if (Math.abs(amount) >= 1000) {
      formattedAmount = (amount / 1000).toFixed(1) + 'K'
    } else {
      formattedAmount = amount.toFixed(decimals)
    }
  } else {
    // Standard format
    formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  }

  // Add currency symbol/code
  if (showSymbol && showCode) {
    return `${symbol}${formattedAmount} ${currency}`
  } else if (showSymbol) {
    return `${symbol}${formattedAmount}`
  } else if (showCode) {
    return `${formattedAmount} ${currency}`
  } else {
    return formattedAmount
  }
}

/**
 * Format date based on workspace settings
 */
export function formatDate(
  date: Date | string,
  workspaceSettings: WorkspaceSettings,
  options: {
    includeTime?: boolean
    relative?: boolean
  } = {}
): string {
  const { timezone, settings } = workspaceSettings
  const { includeTime = false, relative = false } = options

  const dateObj = typeof date === 'string' ? parseISO(date) : date

  // Validate the date object
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }

  const zonedDate = toZonedTime(dateObj, timezone)

  if (relative) {
    // Return relative time (e.g., "2 hours ago")
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    // Fall back to formatted date for older dates
  }

  // Convert date format pattern
  let formatPattern: string
  switch (settings.dateFormat) {
    case 'MM/DD/YYYY':
      formatPattern = 'MM/dd/yyyy'
      break
    case 'DD/MM/YYYY':
      formatPattern = 'dd/MM/yyyy'
      break
    case 'YYYY-MM-DD':
      formatPattern = 'yyyy-MM-dd'
      break
    case 'DD-MM-YYYY':
      formatPattern = 'dd-MM-yyyy'
      break
    case 'MM-DD-YYYY':
      formatPattern = 'MM-dd-yyyy'
      break
    default:
      formatPattern = 'MM/dd/yyyy'
  }

  if (includeTime) {
    const timePattern = settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a'
    formatPattern += ` ${timePattern}`
  }

  return format(zonedDate, formatPattern)
}

/**
 * Format time based on workspace settings
 */
export function formatTime(
  date: Date | string,
  workspaceSettings: WorkspaceSettings
): string {
  const { timezone, settings } = workspaceSettings

  const dateObj = typeof date === 'string' ? parseISO(date) : date

  // Validate the date object
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid time'
  }

  const zonedDate = toZonedTime(dateObj, timezone)

  const timePattern = settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a'
  return format(zonedDate, timePattern)
}

/**
 * Convert local time to workspace timezone
 */
export function toWorkspaceTime(
  date: Date | string,
  workspaceSettings: WorkspaceSettings
): Date {
  const { timezone } = workspaceSettings
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(dateObj, timezone)
}

/**
 * Convert workspace time to UTC
 */
export function fromWorkspaceTime(
  date: Date | string,
  workspaceSettings: WorkspaceSettings
): Date {
  const { timezone } = workspaceSettings
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return fromZonedTime(dateObj, timezone)
}

/**
 * Get workspace-specific number formatting
 */
export function formatNumber(
  number: number,
  workspaceSettings: WorkspaceSettings,
  options: {
    decimals?: number
    compact?: boolean
  } = {}
): string {
  const { decimals = 0, compact = false } = options

  if (compact && Math.abs(number) >= 1000) {
    if (Math.abs(number) >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M'
    } else if (Math.abs(number) >= 1000) {
      return (number / 1000).toFixed(1) + 'K'
    }
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number)
}

/**
 * Get supported currencies list
 */
export function getSupportedCurrencies(): Array<{
  code: string
  name: string
  symbol: string
}> {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  ]
}

/**
 * Get supported timezones list
 */
export function getSupportedTimezones(): Array<{
  value: string
  label: string
  offset: string
}> {
  return [
    {
      value: 'UTC',
      label: 'UTC (Coordinated Universal Time)',
      offset: '+00:00',
    },
    {
      value: 'America/New_York',
      label: 'Eastern Time (US & Canada)',
      offset: '-05:00',
    },
    {
      value: 'America/Chicago',
      label: 'Central Time (US & Canada)',
      offset: '-06:00',
    },
    {
      value: 'America/Denver',
      label: 'Mountain Time (US & Canada)',
      offset: '-07:00',
    },
    {
      value: 'America/Los_Angeles',
      label: 'Pacific Time (US & Canada)',
      offset: '-08:00',
    },
    { value: 'America/Toronto', label: 'Toronto', offset: '-05:00' },
    { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00' },
    { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00' },
    { value: 'America/Sao_Paulo', label: 'São Paulo', offset: '-03:00' },
    { value: 'Europe/London', label: 'London', offset: '+00:00' },
    { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
    { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
    { value: 'Europe/Rome', label: 'Rome', offset: '+01:00' },
    { value: 'Europe/Madrid', label: 'Madrid', offset: '+01:00' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: '+01:00' },
    { value: 'Europe/Stockholm', label: 'Stockholm', offset: '+01:00' },
    { value: 'Europe/Moscow', label: 'Moscow', offset: '+03:00' },
    { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
    { value: 'Asia/Shanghai', label: 'Shanghai', offset: '+08:00' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: '+08:00' },
    { value: 'Asia/Singapore', label: 'Singapore', offset: '+08:00' },
    { value: 'Asia/Mumbai', label: 'Mumbai', offset: '+05:30' },
    { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
    { value: 'Australia/Sydney', label: 'Sydney', offset: '+10:00' },
    { value: 'Australia/Melbourne', label: 'Melbourne', offset: '+10:00' },
    { value: 'Pacific/Auckland', label: 'Auckland', offset: '+12:00' },
  ]
}
