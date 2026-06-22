'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  MoreVertical,
  Settings,
  Trash2,
  RefreshCw,
  Zap,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppSelector } from '@/lib/hooks'

interface EmailAccount {
  _id: string
  provider: 'gmail' | 'outlook' | 'smtp' | 'imap'
  displayName: string
  emailAddress: string
  isActive: boolean
  isDefault: boolean
  connectionStatus: 'connected' | 'expired' | 'not_configured' | 'error'
  stats: {
    emailsSent: number
    emailsReceived: number
    lastUsedAt?: Date
  }
  settings: {
    syncEnabled: boolean
    lastSyncAt?: Date
  }
}

interface EmailAccountListProps {
  activeAccount: string | null
  onAccountSelect: (accountId: string) => void
  onAddAccount: () => void
  onSettingsClick?: (accountId: string) => void
}

export function EmailAccountList({
  activeAccount,
  onAccountSelect,
  onAddAccount,
  onSettingsClick,
}: EmailAccountListProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchAccounts()
    }
  }, [currentWorkspace?.id])

  const fetchAccounts = async () => {
    try {
      const response = await fetch(
        `/api/email/accounts?workspaceId=${currentWorkspace?.id}`
      )
      if (!response.ok) throw new Error('Failed to fetch accounts')

      const data = await response.json()
      setAccounts(data.accounts || [])

      if (!activeAccount && data.accounts?.length > 0) {
        onAccountSelect(data.accounts[0]._id)
      }
    } catch (error) {
      toast.error('Failed to load email accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const syncAccount = async (accountId: string) => {
    setSyncingAccounts(prev => new Set(prev).add(accountId))

    try {
      const response = await fetch(
        `/api/email/accounts/${accountId}/sync?workspaceId=${currentWorkspace?.id}`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) throw new Error('Sync failed')

      const result = await response.json()
      toast.success(`Synced ${result.count} new emails`)

      setAccounts(prev =>
        prev.map(acc =>
          acc._id === accountId
            ? { ...acc, settings: { ...acc.settings, lastSyncAt: new Date() } }
            : acc
        )
      )
    } catch (error) {
      toast.error('Failed to sync emails')
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const deleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this email account?')) return

    try {
      const response = await fetch(
        `/api/email/accounts/${accountId}?workspaceId=${currentWorkspace?.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) throw new Error('Failed to delete account')

      setAccounts(prev => prev.filter(acc => acc._id !== accountId))

      if (activeAccount === accountId) {
        const remainingAccounts = accounts.filter(acc => acc._id !== accountId)
        onAccountSelect(remainingAccounts[0]?._id || '')
      }

      toast.success('Email account deleted')
    } catch (error) {
      toast.error('Failed to delete account')
    }
  }

  const setAsDefault = async (accountId: string) => {
    try {
      const response = await fetch(
        `/api/email/accounts/${accountId}/set-default?workspaceId=${currentWorkspace?.id}`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) throw new Error('Failed to set as default')

      setAccounts(prev =>
        prev.map(acc => ({
          ...acc,
          isDefault: acc._id === accountId,
        }))
      )

      toast.success('Default account updated')
    } catch (error) {
      toast.error('Failed to update default account')
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return '📧'
      case 'outlook':
        return '📨'
      case 'smtp':
        return '📤'
      case 'imap':
        return '📥'
      default:
        return '✉️'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Shield className="h-3 w-3" />
      case 'expired':
        return <AlertTriangle className="h-3 w-3" />
      case 'error':
        return <AlertTriangle className="h-3 w-3" />
      default:
        return <Mail className="h-3 w-3" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="flex animate-pulse items-center space-x-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-700"
            >
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-600" />
                <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 text-center">
        <Mail className="mx-auto mb-3 h-8 w-8 text-gray-400" />
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          No email accounts connected
        </p>
        <Button size="sm" onClick={onAddAccount} className="w-full">
          Add Your First Account
        </Button>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="space-y-2">
        {accounts.map(account => (
          <div
            key={account._id}
            className={`group relative flex cursor-pointer items-center space-x-3 rounded-lg p-3 transition-colors ${
              activeAccount === account._id
                ? 'border border-primary/20 bg-primary/10'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => onAccountSelect(account._id)}
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-lg">
                {getProviderIcon(account.provider)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {account.displayName}
                </p>
                {account.isDefault && (
                  <span className="inline-flex h-4 shrink-0 items-center rounded bg-primary px-1.5 py-0 text-[10px] font-medium text-white">
                    Default
                  </span>
                )}
              </div>

              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {account.emailAddress}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`flex h-4 items-center gap-1 px-1.5 py-0 text-[10px] ${getStatusColor(account.connectionStatus)}`}
                >
                  {getStatusIcon(account.connectionStatus)}
                  <span className="capitalize">{account.connectionStatus}</span>
                </Badge>

                {account.settings.syncEnabled &&
                  account.settings.lastSyncAt && (
                    <span className="shrink-0 text-[10px] text-gray-400">
                      {new Date(account.settings.lastSyncAt).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={e => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={e => e.stopPropagation()}
              >
                {account.settings.syncEnabled && (
                  <DropdownMenuItem
                    onSelect={() => syncAccount(account._id)}
                    disabled={syncingAccounts.has(account._id)}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${syncingAccounts.has(account._id) ? 'animate-spin' : ''}`}
                    />
                    Sync Now
                  </DropdownMenuItem>
                )}

                {!account.isDefault && (
                  <DropdownMenuItem onSelect={() => setAsDefault(account._id)}>
                    <Zap className="mr-2 h-4 w-4" />
                    Set as Default
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onSelect={() => onSettingsClick?.(account._id)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={() => deleteAccount(account._id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onAddAccount}
        className="mt-3 w-full justify-start text-gray-600 dark:text-gray-400"
      >
        <Mail className="mr-2 h-4 w-4" />
        Add Another Account
      </Button>
    </div>
  )
}
