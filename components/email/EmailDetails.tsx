'use client'

import { useState, useEffect } from 'react'
import {
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Download,
  ExternalLink,
  Flag,
  Clock,
  Paperclip,
  User,
  Calendar,
  Link as LinkIcon,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppSelector } from '@/lib/hooks'

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
  cc?: Array<{
    name?: string
    email: string
  }>
  bcc?: Array<{
    name?: string
    email: string
  }>
  replyTo?: {
    name?: string
    email: string
  }
  subject: string
  bodyText?: string
  bodyHtml?: string
  attachments: Array<{
    filename: string
    contentType: string
    size: number
    attachmentId: string
    isInline?: boolean
  }>
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
  linkedLeadId?: string
  linkedContactId?: string
  linkedProjectId?: string
  linkedTaskId?: string
  createdAt: Date
}

interface ReplyData {
  messageId: string
  subject: string
  from: string
  to: string[]
}

interface EmailDetailsProps {
  emailId: string
  onReply: (replyData?: ReplyData) => void
  onDelete: () => void
}

export function EmailDetails({
  emailId,
  onReply,
  onDelete,
}: EmailDetailsProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [email, setEmail] = useState<EmailMessage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showRawContent, setShowRawContent] = useState(false)

  useEffect(() => {
    if (emailId) {
      fetchEmail()
    }
  }, [emailId])

  const fetchEmail = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/email/messages/${emailId}?workspaceId=${currentWorkspace?.id}`
      )
      if (!response.ok) throw new Error('Failed to fetch email')

      const data = await response.json()
      setEmail(data.message)

      if (!data.message.isRead) {
        markAsRead()
      }
    } catch (error) {
      toast.error('Failed to load email')
      console.error('Fetch email error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateMessage = async (data: Record<string, any>) => {
    const response = await fetch(
      `/api/email/messages/${emailId}?workspaceId=${currentWorkspace?.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    )
    if (!response.ok) throw new Error('Failed to update email')
    return response
  }

  const markAsRead = async () => {
    try {
      await updateMessage({ isRead: true })
      setEmail(prev =>
        prev ? { ...prev, isRead: true, readAt: new Date() } : null
      )
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const toggleStar = async () => {
    if (!email) return
    try {
      await updateMessage({ isStarred: !email.isStarred })
      setEmail(prev => (prev ? { ...prev, isStarred: !prev.isStarred } : null))
    } catch (error) {
      toast.error('Failed to update star status')
    }
  }

  const moveToFolder = async (folder: string) => {
    try {
      await updateMessage({ folder })
      toast.success(`Moved to ${folder}`)
      onDelete()
    } catch (error) {
      toast.error('Failed to move email')
    }
  }

  const deleteEmail = async () => {
    if (!confirm('Are you sure you want to delete this email?')) return
    try {
      const response = await fetch(
        `/api/email/messages/${emailId}?workspaceId=${currentWorkspace?.id}`,
        {
          method: 'DELETE',
        }
      )
      if (!response.ok) throw new Error('Failed to delete email')
      toast.success('Email deleted')
      onDelete()
    } catch (error) {
      toast.error('Failed to delete email')
    }
  }

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await fetch(
        `/api/email/attachments/${attachmentId}?workspaceId=${currentWorkspace?.id}`
      )
      if (!response.ok) throw new Error('Failed to download attachment')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast.error('Failed to download attachment')
    }
  }

  const linkToCRM = async (
    type: 'lead' | 'contact' | 'project' | 'task',
    id: string
  ) => {
    try {
      const key = `linked${type.charAt(0).toUpperCase() + type.slice(1)}Id`
      await updateMessage({ [key]: id })
      setEmail(prev => (prev ? { ...prev, [key]: id } : null))
      toast.success(`Linked to ${type}`)
    } catch (error) {
      toast.error('Failed to link to CRM')
    }
  }

  const getReplyData = (): ReplyData | undefined => {
    if (!email) return undefined
    return {
      messageId: email.messageId,
      subject: email.subject.startsWith('Re:')
        ? email.subject
        : `Re: ${email.subject}`,
      from: email.from.email,
      to: email.to.map(r => r.email),
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'low':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800'
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'failed':
      case 'bounced':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'draft':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="mb-4 text-4xl">📧</div>
          <p>Email not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={toggleStar}>
              <Star
                className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
              />
            </Button>

            <Badge className={getPriorityColor(email.priority)}>
              {email.priority}
            </Badge>

            <Badge className={getStatusColor(email.status)}>
              {email.status}
            </Badge>

            {email.isImportant && (
              <Badge variant="destructive">Important</Badge>
            )}

            {email.isSnoozed && (
              <Badge variant="outline" className="text-orange-600">
                <Clock className="mr-1 h-3 w-3" />
                Snoozed
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReply(getReplyData())}
            >
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onReply(getReplyData())}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => onReply(getReplyData())}>
                  <ReplyAll className="mr-2 h-4 w-4" />
                  Reply All
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() =>
                    onReply({
                      ...getReplyData()!,
                      subject: email.subject.startsWith('Fwd:')
                        ? email.subject
                        : `Fwd: ${email.subject}`,
                      from: '',
                      to: [],
                    })
                  }
                >
                  <Forward className="mr-2 h-4 w-4" />
                  Forward
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => moveToFolder('ARCHIVE')}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => moveToFolder('TRASH')}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => setShowRawContent(!showRawContent)}
                >
                  {showRawContent ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {showRawContent ? 'Hide' : 'Show'} Raw
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={deleteEmail}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          {email.subject || '(No Subject)'}
        </h1>

        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {email.from.name
                ? email.from.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                : email.from.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {email.from.name || email.from.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {email.from.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(
                    email.receivedAt || email.sentAt || email.createdAt
                  )}
                </p>
                {email.direction === 'outbound' && (
                  <Badge variant="outline" className="text-xs">
                    Sent
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">To:</span>{' '}
                {email.to
                  .map(recipient => recipient.name || recipient.email)
                  .join(', ')}
              </p>

              {email.cc && email.cc.length > 0 && (
                <p>
                  <span className="font-medium">Cc:</span>{' '}
                  {email.cc
                    .map(recipient => recipient.name || recipient.email)
                    .join(', ')}
                </p>
              )}

              {email.bcc && email.bcc.length > 0 && (
                <p>
                  <span className="font-medium">Bcc:</span>{' '}
                  {email.bcc
                    .map(recipient => recipient.name || recipient.email)
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {(email.linkedLeadId ||
          email.linkedContactId ||
          email.linkedProjectId ||
          email.linkedTaskId) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {email.linkedLeadId && (
              <Badge variant="outline" className="text-green-600">
                <User className="mr-1 h-3 w-3" />
                Linked to Lead
              </Badge>
            )}
            {email.linkedContactId && (
              <Badge variant="outline" className="text-blue-600">
                <User className="mr-1 h-3 w-3" />
                Linked to Contact
              </Badge>
            )}
            {email.linkedProjectId && (
              <Badge variant="outline" className="text-purple-600">
                <Calendar className="mr-1 h-3 w-3" />
                Linked to Project
              </Badge>
            )}
            {email.linkedTaskId && (
              <Badge variant="outline" className="text-orange-600">
                <Calendar className="mr-1 h-3 w-3" />
                Linked to Task
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {email.attachments.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center text-sm font-medium">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attachments ({email.attachments.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                {email.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-700"
                  >
                    <div className="flex items-center space-x-2">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)} •{' '}
                          {attachment.contentType}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        downloadAttachment(
                          attachment.attachmentId,
                          attachment.filename
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="prose prose-sm max-w-none dark:prose-invert">
          {showRawContent ? (
            <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-gray-100 p-4 text-xs dark:bg-gray-800">
              {email.bodyText}
            </pre>
          ) : email.bodyHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              className="email-content"
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {email.bodyText || 'No content available'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
