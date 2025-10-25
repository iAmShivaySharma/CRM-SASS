'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import {
  Send,
  Paperclip,
  X,
  Loader2,
  Save,
  Eye,
  Type,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Users,
  Calendar,
  Clock,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailComposeProps {
  isOpen: boolean
  onClose: () => void
  accountId: string | null
  onEmailSent: () => void
  replyTo?: {
    messageId: string
    subject: string
    from: string
    to: string[]
  }
  forwardFrom?: {
    messageId: string
    subject: string
    content: string
  }
}

interface Attachment {
  id: string
  file: File
  uploading: boolean
  uploaded: boolean
  error?: string
}

interface EmailAccount {
  _id: string
  displayName: string
  emailAddress: string
  provider: string
}

interface EmailTemplate {
  _id: string
  name: string
  subject: string
  bodyHtml: string
  variables: Array<{
    name: string
    placeholder: string
    defaultValue?: string
    required: boolean
  }>
}

export function EmailCompose({
  isOpen,
  onClose,
  accountId,
  onEmailSent,
  replyTo,
  forwardFrom
}: EmailComposeProps) {
  const [emailData, setEmailData] = useState({
    from: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  })

  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isRichText, setIsRichText] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
      fetchTemplates()
      initializeForm()
    }
  }, [isOpen, accountId, replyTo, forwardFrom])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/email/accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')

      const data = await response.json()
      setAccounts(data.accounts || [])

      // Set default account
      if (accountId) {
        const account = data.accounts?.find((acc: EmailAccount) => acc._id === accountId)
        if (account) {
          setEmailData(prev => ({ ...prev, from: account._id }))
        }
      }
    } catch (error) {
      toast.error('Failed to load email accounts')
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates')
      if (!response.ok) throw new Error('Failed to fetch templates')

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const initializeForm = () => {
    if (replyTo) {
      setEmailData(prev => ({
        ...prev,
        to: replyTo.from,
        subject: replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`,
        body: `\n\n--- Original Message ---\nFrom: ${replyTo.from}\nTo: ${replyTo.to.join(', ')}\nSubject: ${replyTo.subject}\n\n`
      }))
    } else if (forwardFrom) {
      setEmailData(prev => ({
        ...prev,
        subject: forwardFrom.subject.startsWith('Fwd:') ? forwardFrom.subject : `Fwd: ${forwardFrom.subject}`,
        body: `\n\n--- Forwarded Message ---\n${forwardFrom.content}`
      }))
    } else {
      // Reset form for new compose
      setEmailData({
        from: accountId || '',
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: ''
      })
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    files.forEach(file => {
      const attachment: Attachment = {
        id: Math.random().toString(36).substring(2),
        file,
        uploading: true,
        uploaded: false
      }

      setAttachments(prev => [...prev, attachment])

      // Simulate upload
      setTimeout(() => {
        setAttachments(prev => prev.map(att =>
          att.id === attachment.id
            ? { ...att, uploading: false, uploaded: true }
            : att
        ))
      }, 1000)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id))
  }

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t._id === templateId)
    if (!template) return

    setEmailData(prev => ({
      ...prev,
      subject: template.subject,
      body: template.bodyHtml
    }))

    setSelectedTemplate(templateId)
    toast.success('Template applied')
  }

  const formatText = (command: string, value?: string) => {
    if (!isRichText || !editorRef.current) return

    document.execCommand(command, false, value)
    editorRef.current.focus()
  }

  const saveDraft = async () => {
    setIsDraft(true)

    try {
      const response = await fetch('/api/email/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: emailData.from,
          ...emailData,
          attachments: attachments.filter(att => att.uploaded).map(att => ({
            filename: att.file.name,
            size: att.file.size,
            type: att.file.type
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to save draft')

      toast.success('Draft saved')
    } catch (error) {
      toast.error('Failed to save draft')
    } finally {
      setIsDraft(false)
    }
  }

  const sendEmail = async () => {
    if (!emailData.from || !emailData.to || !emailData.subject) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSending(true)

    try {
      const formData = new FormData()
      formData.append('accountId', emailData.from)
      formData.append('to', emailData.to)
      formData.append('cc', emailData.cc)
      formData.append('bcc', emailData.bcc)
      formData.append('subject', emailData.subject)
      formData.append('body', emailData.body)
      formData.append('priority', priority)

      if (scheduleDate) {
        formData.append('scheduleDate', scheduleDate)
      }

      if (replyTo) {
        formData.append('inReplyTo', replyTo.messageId)
      }

      // Add attachments
      attachments.filter(att => att.uploaded).forEach(att => {
        formData.append('attachments', att.file)
      })

      const response = await fetch('/api/email/send', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send email')
      }

      toast.success(scheduleDate ? 'Email scheduled successfully' : 'Email sent successfully')
      onEmailSent()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Send className="h-5 w-5 mr-2" />
              {replyTo ? 'Reply' : forwardFrom ? 'Forward' : 'Compose Email'}
            </div>
            <div className="flex items-center space-x-2">
              {templates.length > 0 && (
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Templates" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template._id} value={template._id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={saveDraft}
                disabled={isDraft}
              >
                {isDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From Account */}
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Select value={emailData.from} onValueChange={(value) => setEmailData(prev => ({ ...prev, from: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select email account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account._id} value={account._id}>
                    <div className="flex items-center">
                      <span className="font-medium">{account.displayName}</span>
                      <span className="ml-2 text-sm text-muted-foreground">&lt;{account.emailAddress}&gt;</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="to"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="recipient@email.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(!showCc)}
                className="text-sm"
              >
                Cc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(!showBcc)}
                className="text-sm"
              >
                Bcc
              </Button>
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="space-y-2">
              <Label htmlFor="cc">Cc</Label>
              <Input
                id="cc"
                value={emailData.cc}
                onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                placeholder="cc@email.com"
              />
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="space-y-2">
              <Label htmlFor="bcc">Bcc</Label>
              <Input
                id="bcc"
                value={emailData.bcc}
                onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                placeholder="bcc@email.com"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                className="flex-1"
              />
              <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'normal' | 'high')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rich Text Toolbar */}
          {isRichText && (
            <div className="flex items-center space-x-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('bold')}
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('italic')}
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('underline')}
                className="h-8 w-8 p-0"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('justifyLeft')}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('justifyCenter')}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('justifyRight')}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('insertUnorderedList')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRichText(false)}
                className="h-8 w-8 p-0"
                title="Switch to plain text"
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Email Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message *</Label>
              {!isRichText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRichText(true)}
                  className="text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Rich Text
                </Button>
              )}
            </div>

            {isRichText ? (
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[200px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: emailData.body }}
                onInput={(e) => {
                  const target = e.target as HTMLDivElement
                  setEmailData(prev => ({ ...prev, body: target.innerHTML }))
                }}
              />
            ) : (
              <Textarea
                id="body"
                value={emailData.body.replace(/<[^>]*>/g, '')} // Strip HTML for plain text
                onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Type your message here..."
                className="min-h-[200px] resize-none"
              />
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Attachments</Label>
                  <Badge variant="secondary">
                    {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">{attachment.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {attachment.uploading && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {attachment.uploaded && (
                          <Badge variant="outline" className="text-green-600">
                            Ready
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileSelect}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex items-center space-x-2">
                <Label htmlFor="schedule" className="text-sm">Schedule:</Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={sendEmail}
                disabled={isSending || !emailData.from || !emailData.to || !emailData.subject}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {scheduleDate ? 'Schedule' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}