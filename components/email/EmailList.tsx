'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Star,
  Paperclip,
  MoreVertical,
  Archive,
  Trash2,
  Tag,
  Flag,
  Clock,
  Eye,
  EyeOff,
  Reply,
  Forward,
  UserCheck,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailMessage {
  _id: string
  messageId: string
  threadId?: string
  from: {
    name?: string
    email: string
  }
  to: Array<{
    name?: string
    email: string
  }>
  subject: string
  bodyText?: string
  direction: 'inbound' | 'outbound' | 'draft'
  status: 'draft' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read'
  priority: 'low' | 'normal' | 'high'
  sentAt?: Date
  receivedAt?: Date
  readAt?: Date
  isRead: boolean
  isStarred: boolean
  isImportant: boolean
  isSnoozed: boolean
  attachmentCount: number
  linkedLeadId?: string
  linkedContactId?: string
  createdAt: Date
}

interface EmailListProps {
  accountId: string
  folder: string
  searchQuery: string
  filters: any
  selectedEmailId: string | null
  onEmailSelect: (emailId: string) => void
}

export function EmailList({
  accountId,
  folder,
  searchQuery,
  filters,
  selectedEmailId,
  onEmailSelect
}: EmailListProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (accountId) {
      fetchEmails()
    }
  }, [accountId, folder, searchQuery, filters])

  const fetchEmails = async (pageNum = 1) => {
    setIsLoading(pageNum === 1)

    try {
      const params = new URLSearchParams({
        accountId,
        folder,
        page: pageNum.toString(),
        limit: '50',
        ...(searchQuery && { search: searchQuery }),
        ...filters
      })

      const response = await fetch(`/api/email/messages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch emails')

      const data = await response.json()

      if (pageNum === 1) {
        setEmails(data.messages || [])
      } else {
        setEmails(prev => [...prev, ...(data.messages || [])])
      }

      setHasMore(data.hasMore || false)
      setPage(pageNum)
    } catch (error) {
      toast.error('Failed to load emails')
      console.error('Fetch emails error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  const selectAllEmails = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(emails.map(email => email._id)))
    }
  }

  const markAsRead = async (emailIds: string[], read = true) => {
    try {
      const response = await fetch('/api/email/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds, read })
      })

      if (!response.ok) throw new Error('Failed to update read status')

      setEmails(prev => prev.map(email =>
        emailIds.includes(email._id)
          ? { ...email, isRead: read, readAt: read ? new Date() : undefined }
          : email
      ))

      toast.success(`Marked ${emailIds.length} email(s) as ${read ? 'read' : 'unread'}`)
    } catch (error) {
      toast.error('Failed to update read status')
    }
  }

  const toggleStar = async (emailId: string) => {
    try {
      const email = emails.find(e => e._id === emailId)
      if (!email) return

      const response = await fetch(`/api/email/messages/${emailId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !email.isStarred })
      })

      if (!response.ok) throw new Error('Failed to update star status')

      setEmails(prev => prev.map(e =>
        e._id === emailId ? { ...e, isStarred: !e.isStarred } : e
      ))
    } catch (error) {
      toast.error('Failed to update star status')
    }
  }

  const moveToFolder = async (emailIds: string[], targetFolder: string) => {
    try {
      const response = await fetch('/api/email/messages/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds, folder: targetFolder })
      })

      if (!response.ok) throw new Error('Failed to move emails')

      setEmails(prev => prev.filter(email => !emailIds.includes(email._id)))
      setSelectedEmails(new Set())

      toast.success(`Moved ${emailIds.length} email(s) to ${targetFolder}`)
    } catch (error) {
      toast.error('Failed to move emails')
    }
  }

  const deleteEmails = async (emailIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${emailIds.length} email(s)?`)) return

    try {
      const response = await fetch('/api/email/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      })

      if (!response.ok) throw new Error('Failed to delete emails')

      setEmails(prev => prev.filter(email => !emailIds.includes(email._id)))
      setSelectedEmails(new Set())

      toast.success(`Deleted ${emailIds.length} email(s)`)
    } catch (error) {
      toast.error('Failed to delete emails')
    }
  }

  const formatTime = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' })
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'low':
        return 'text-gray-400'
      default:
        return ''
    }
  }

  const getStatusBadge = (email: EmailMessage) => {
    if (email.direction === 'draft') {
      return <Badge variant="outline" className="text-orange-600">Draft</Badge>
    }
    if (email.status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (email.status === 'bounced') {
      return <Badge variant="outline" className="text-red-600">Bounced</Badge>
    }
    return null
  }

  if (isLoading && emails.length === 0) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-600 rounded" />
                <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-600 rounded" />
              </div>
              <div className="w-12 h-3 bg-gray-200 dark:bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-lg font-medium mb-2">No emails in {folder}</p>
          <p className="text-sm">
            {searchQuery ? 'Try adjusting your search terms' : 'Your inbox is clean!'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Bulk Actions */}
      {selectedEmails.size > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedEmails.size} email(s) selected
            </span>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAsRead(Array.from(selectedEmails), true)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAsRead(Array.from(selectedEmails), false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveToFolder(Array.from(selectedEmails), 'archive')}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteEmails(Array.from(selectedEmails))}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {/* Select All Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={selectedEmails.size === emails.length && emails.length > 0}
              onCheckedChange={selectAllEmails}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {emails.length} email{emails.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Email Items */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {emails.map((email) => (
            <div
              key={email._id}
              className={`group flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                selectedEmailId === email._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              } ${!email.isRead ? 'bg-blue-25 dark:bg-blue-950/10' : ''}`}
              onClick={() => onEmailSelect(email._id)}
            >
              {/* Checkbox */}
              <Checkbox
                checked={selectedEmails.has(email._id)}
                onCheckedChange={() => toggleEmailSelection(email._id)}
                onClick={(e) => e.stopPropagation()}
              />

              {/* Star */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleStar(email._id)
                }}
              >
                <Star className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
              </Button>

              {/* Important Flag */}
              {email.isImportant && (
                <Flag className="h-4 w-4 text-red-500" />
              )}

              {/* Avatar */}
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {email.from.name
                    ? email.from.name.split(' ').map(n => n[0]).join('').toUpperCase()
                    : email.from.email[0].toUpperCase()
                  }
                </AvatarFallback>
              </Avatar>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`font-medium truncate ${!email.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {email.direction === 'outbound' ? 'To: ' : ''}
                      {email.from.name || email.from.email}
                    </span>

                    {/* CRM Links */}
                    {(email.linkedLeadId || email.linkedContactId) && (
                      <UserCheck className="h-3 w-3 text-green-600" />
                    )}

                    {/* Status Badge */}
                    {getStatusBadge(email)}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Attachments */}
                    {email.attachmentCount > 0 && (
                      <Paperclip className="h-3 w-3 text-gray-400" />
                    )}

                    {/* Priority */}
                    {email.priority !== 'normal' && (
                      <Flag className={`h-3 w-3 ${getPriorityColor(email.priority)}`} />
                    )}

                    {/* Snoozed */}
                    {email.isSnoozed && (
                      <Clock className="h-3 w-3 text-orange-500" />
                    )}

                    {/* Time */}
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTime(email.receivedAt || email.sentAt || email.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {email.subject || '(No Subject)'}
                  </h3>
                </div>

                {/* Preview */}
                {email.bodyText && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {email.bodyText.replace(/\s+/g, ' ').substring(0, 100)}
                  </p>
                )}
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => markAsRead([email._id], !email.isRead)}>
                    {email.isRead ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    Mark as {email.isRead ? 'Unread' : 'Read'}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {}}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {}}>
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => moveToFolder([email._id], 'archive')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {}}>
                    <Tag className="h-4 w-4 mr-2" />
                    Link to CRM
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => deleteEmails([email._id])}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => fetchEmails(page + 1)}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}