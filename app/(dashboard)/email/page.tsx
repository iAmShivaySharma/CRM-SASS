'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MoreVertical
} from 'lucide-react'
import { EmailAccountSetup } from '@/components/email/EmailAccountSetup'
import { EmailCompose } from '@/components/email/EmailCompose'
import { EmailList } from '@/components/email/EmailList'
import { EmailDetails } from '@/components/email/EmailDetails'
import { EmailAccountList } from '@/components/email/EmailAccountList'
import { EmailFilters } from '@/components/email/EmailFilters'
import { EmailSearch } from '@/components/email/EmailSearch'

export default function EmailPage() {
  const [activeAccount, setActiveAccount] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [showAccountSetup, setShowAccountSetup] = useState(false)
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Email Accounts & Folders */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email
            </h1>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCompose(true)}
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

          {/* Quick Compose Button */}
          <Button
            onClick={() => setShowCompose(true)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>

        {/* Email Accounts */}
        <div className="flex-1 overflow-y-auto">
          <EmailAccountList
            activeAccount={activeAccount}
            onAccountSelect={setActiveAccount}
            onAddAccount={() => setShowAccountSetup(true)}
          />

          {/* Folders */}
          {activeAccount && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Folders
              </h3>
              <div className="space-y-1">
                {[
                  { id: 'inbox', label: 'Inbox', icon: Inbox, count: 12 },
                  { id: 'sent', label: 'Sent', icon: Send, count: 0 },
                  { id: 'drafts', label: 'Drafts', icon: Mail, count: 3 },
                  { id: 'starred', label: 'Starred', icon: Star, count: 2 },
                  { id: 'archive', label: 'Archive', icon: Archive, count: 0 },
                  { id: 'trash', label: 'Trash', icon: Trash2, count: 0 },
                ].map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentFolder === folder.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <folder.icon className="h-4 w-4 mr-3" />
                      {folder.label}
                    </div>
                    {folder.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {folder.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {activeAccount ? (
          <>
            {/* Email List */}
            <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Search & Filters */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                <EmailSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search emails..."
                />
                <EmailFilters
                  currentFolder={currentFolder}
                  filters={filterOptions}
                  onFiltersChange={setFilterOptions}
                />
              </div>

              {/* Email List Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-gray-900 dark:text-white capitalize">
                    {currentFolder}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsLoading(true)
                        // TODO: Implement sync
                        setTimeout(() => setIsLoading(false), 1000)
                      }}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto">
                <EmailList
                  accountId={activeAccount}
                  folder={currentFolder}
                  searchQuery={searchQuery}
                  filters={filterOptions}
                  selectedEmailId={selectedEmailId}
                  onEmailSelect={setSelectedEmailId}
                />
              </div>
            </div>

            {/* Email Details */}
            <div className="flex-1 bg-white dark:bg-gray-800">
              {selectedEmailId ? (
                <EmailDetails
                  emailId={selectedEmailId}
                  onReply={() => setShowCompose(true)}
                  onDelete={() => setSelectedEmailId(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No email selected</p>
                    <p className="text-sm">Choose an email from the list to view its contents</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // No Account Selected
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center max-w-md">
              <Mail className="h-16 w-16 mx-auto mb-6 text-gray-400" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Welcome to Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your email accounts to start managing your emails directly from your CRM.
                Support for Gmail, Outlook, and custom SMTP/IMAP servers.
              </p>
              <Button
                onClick={() => setShowAccountSetup(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Email Account
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAccountSetup && (
        <EmailAccountSetup
          isOpen={showAccountSetup}
          onClose={() => setShowAccountSetup(false)}
          onAccountAdded={(accountId) => {
            setActiveAccount(accountId)
            setShowAccountSetup(false)
          }}
        />
      )}

      {showCompose && (
        <EmailCompose
          isOpen={showCompose}
          onClose={() => setShowCompose(false)}
          accountId={activeAccount}
          onEmailSent={() => {
            setShowCompose(false)
            // TODO: Refresh email list
          }}
        />
      )}
    </div>
  )
}