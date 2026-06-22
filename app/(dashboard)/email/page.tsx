'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  Plus,
  Settings,
  Send,
  Inbox,
  Archive,
  Star,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailAccountSetup } from '@/components/email/EmailAccountSetup'
import { EmailCompose } from '@/components/email/EmailCompose'
import { EmailList } from '@/components/email/EmailList'
import { EmailDetails } from '@/components/email/EmailDetails'
import { EmailAccountList } from '@/components/email/EmailAccountList'
import { EmailFilters } from '@/components/email/EmailFilters'
import { EmailSearch } from '@/components/email/EmailSearch'
import { useAppSelector } from '@/lib/hooks'

export default function EmailPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [activeAccount, setActiveAccount] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyContext, setReplyContext] = useState<{
    messageId: string
    subject: string
    from: string
    to: string[]
  } | null>(null)
  const [showAccountSetup, setShowAccountSetup] = useState(false)
  const [currentFolder, setCurrentFolder] = useState('INBOX')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [providerFolders, setProviderFolders] = useState<
    Array<{
      id: string
      name: string
      type?: string
      messagesTotal?: number
      messagesUnread?: number
    }>
  >([])

  const fetchFolders = useCallback(async () => {
    if (!activeAccount || !currentWorkspace?.id) return
    try {
      const response = await fetch(
        `/api/email/folders?workspaceId=${currentWorkspace.id}&accountId=${activeAccount}`
      )
      if (response.ok) {
        const data = await response.json()
        setProviderFolders(data.folders || [])
      }
    } catch {
      // Silently fail
    }
  }, [activeAccount, currentWorkspace?.id])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  const triggerSync = useCallback(
    async (accountId: string) => {
      if (!currentWorkspace?.id || isLoading) return
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/email/accounts/${accountId}/sync?workspaceId=${currentWorkspace.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'INBOX', limit: 50 }),
          }
        )
        const data = await response.json()
        if (response.ok) {
          toast.success(`Synced ${data.count} emails`)
          setRefreshKey(prev => prev + 1)
          fetchFolders()
        } else {
          toast.error(data.error || 'Failed to sync emails')
        }
      } catch {
        toast.error('Failed to sync emails')
      } finally {
        setIsLoading(false)
      }
    },
    [currentWorkspace?.id, fetchFolders, isLoading]
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      <div className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <Mail className="mr-2 h-5 w-5" />
              Email
            </h1>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyContext(null)
                  setShowCompose(true)
                }}
                className="p-2"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAccountSetup(true)}
                className="p-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={() => {
              setReplyContext(null)
              setShowCompose(true)
            }}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Send className="mr-2 h-4 w-4" />
            Compose
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <EmailAccountList
            key={`accounts-${refreshKey}`}
            activeAccount={activeAccount}
            onAccountSelect={setActiveAccount}
            onAddAccount={() => setShowAccountSetup(true)}
          />

          {activeAccount && (
            <div className="border-t border-gray-200 p-3 dark:border-gray-700">
              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Folders
              </h3>
              <div className="space-y-1">
                {(() => {
                  const iconMap: Record<string, any> = {
                    INBOX: Inbox,
                    SENT: Send,
                    DRAFT: Mail,
                    STARRED: Star,
                    TRASH: Trash2,
                    SPAM: Archive,
                  }

                  const systemFolders = providerFolders.filter(
                    f =>
                      f.type === 'system' &&
                      [
                        'INBOX',
                        'SENT',
                        'DRAFT',
                        'STARRED',
                        'TRASH',
                        'SPAM',
                      ].includes(f.id)
                  )

                  const foldersToShow =
                    systemFolders.length > 0
                      ? systemFolders.map(f => ({
                          id: f.id,
                          label: f.name,
                          icon: iconMap[f.id] || Mail,
                          total: f.messagesTotal || 0,
                          unread: f.messagesUnread || 0,
                        }))
                      : [
                          {
                            id: 'INBOX',
                            label: 'Inbox',
                            icon: Inbox,
                            total: 0,
                            unread: 0,
                          },
                          {
                            id: 'SENT',
                            label: 'Sent',
                            icon: Send,
                            total: 0,
                            unread: 0,
                          },
                          {
                            id: 'DRAFT',
                            label: 'Drafts',
                            icon: Mail,
                            total: 0,
                            unread: 0,
                          },
                          {
                            id: 'STARRED',
                            label: 'Starred',
                            icon: Star,
                            total: 0,
                            unread: 0,
                          },
                          {
                            id: 'TRASH',
                            label: 'Trash',
                            icon: Trash2,
                            total: 0,
                            unread: 0,
                          },
                        ]

                  return foldersToShow.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setCurrentFolder(folder.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        currentFolder === folder.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <folder.icon className="mr-3 h-4 w-4" />
                        {folder.label}
                      </div>
                      {folder.unread > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {folder.unread}
                        </Badge>
                      )}
                    </button>
                  ))
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1">
        {activeAccount ? (
          <>
            <div className="flex w-96 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="space-y-2 border-b border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                    {providerFolders.find(f => f.id === currentFolder)?.name ||
                      currentFolder}
                  </h2>
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        activeAccount && triggerSync(activeAccount)
                      }
                      disabled={isLoading}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <EmailSearch
                  onSearch={setSearchQuery}
                  placeholder="Search emails..."
                />
                <EmailFilters
                  currentFolder={currentFolder}
                  filters={filterOptions}
                  onFiltersChange={setFilterOptions}
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                <EmailList
                  key={`list-${refreshKey}`}
                  accountId={activeAccount}
                  folder={currentFolder}
                  searchQuery={searchQuery}
                  filters={filterOptions}
                  selectedEmailId={selectedEmailId}
                  onEmailSelect={setSelectedEmailId}
                />
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800">
              {selectedEmailId ? (
                <EmailDetails
                  emailId={selectedEmailId}
                  onReply={replyData => {
                    setReplyContext(replyData || null)
                    setShowCompose(true)
                  }}
                  onDelete={() => setSelectedEmailId(null)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="mb-2 text-lg font-medium">
                      No email selected
                    </p>
                    <p className="text-sm">
                      Choose an email from the list to view its contents
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-800">
            <div className="max-w-md text-center">
              <Mail className="mx-auto mb-6 h-16 w-16 text-gray-400" />
              <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
                Welcome to Email
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Connect your email accounts to start managing your emails
                directly from your CRM. Support for Gmail, Outlook, and custom
                SMTP/IMAP servers.
              </p>
              <Button
                onClick={() => setShowAccountSetup(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Email Account
              </Button>
            </div>
          </div>
        )}
      </div>

      {showAccountSetup && (
        <EmailAccountSetup
          isOpen={showAccountSetup}
          onClose={() => setShowAccountSetup(false)}
          onAccountAdded={accountId => {
            setActiveAccount(accountId)
            setShowAccountSetup(false)
            setRefreshKey(prev => prev + 1)
            triggerSync(accountId)
          }}
        />
      )}

      {showCompose && (
        <EmailCompose
          isOpen={showCompose}
          onClose={() => {
            setShowCompose(false)
            setReplyContext(null)
          }}
          accountId={activeAccount}
          replyTo={replyContext || undefined}
          onEmailSent={() => {
            setShowCompose(false)
            setReplyContext(null)
            setRefreshKey(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}
