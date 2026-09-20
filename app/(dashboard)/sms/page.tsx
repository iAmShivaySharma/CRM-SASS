'use client'

import { useState, useMemo } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  Loader2,
  Smartphone,
  Send,
  Plus,
  Trash2,
  Pencil,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  TestTube,
} from 'lucide-react'
import {
  useGetTemplatesQuery,
  useGetSmsLogsQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useSendSmsMutation,
  useSendBulkSmsMutation,
} from '@/lib/api/smsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

export default function SmsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id ?? ''

  const { data: templatesData, isLoading: templatesLoading } =
    useGetTemplatesQuery({ workspaceId }, { skip: !currentWorkspace })

  const { data: logsData, isLoading: logsLoading } = useGetSmsLogsQuery(
    { workspaceId },
    { skip: !currentWorkspace }
  )

  const [sendSms, { isLoading: sending }] = useSendSmsMutation()
  const [sendBulkSms, { isLoading: bulkSending }] = useSendBulkSmsMutation()
  const [createTemplate] = useCreateTemplateMutation()
  const [updateTemplate] = useUpdateTemplateMutation()
  const [deleteTemplate] = useDeleteTemplateMutation()

  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [bulkEnabled, setBulkEnabled] = useState(false)
  const [bulkNumbers, setBulkNumbers] = useState('')

  const [logStatusFilter, setLogStatusFilter] = useState<string>('all')
  const [logSearch, setLogSearch] = useState('')

  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    type: 'transactional' as 'transactional' | 'promotional' | 'otp',
  })

  const [settingsForm, setSettingsForm] = useState({
    provider: 'msg91',
    apiKey: '',
    senderId: '',
    dltTemplateId: '',
  })

  const templates = templatesData?.templates ?? []
  const logs = logsData?.logs ?? []

  const filteredLogs = useMemo(() => {
    let filtered = logs
    if (logStatusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === logStatusFilter)
    }
    if (logSearch.trim()) {
      filtered = filtered.filter(l => l.to.includes(logSearch.trim()))
    }
    return filtered
  }, [logs, logStatusFilter, logSearch])

  const bulkNumbersList = bulkNumbers
    .split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (bulkEnabled) {
      if (bulkNumbersList.length === 0) {
        toast.error('Please enter at least one phone number')
        return
      }
      try {
        await sendBulkSms({
          workspaceId,
          recipients: bulkNumbersList.map(n =>
            n.startsWith('+') ? n : `+91${n}`
          ),
          message: message.trim(),
          templateId: selectedTemplateId || undefined,
        }).unwrap()
        toast.success(`SMS sent to ${bulkNumbersList.length} recipients`)
        setBulkNumbers('')
        setMessage('')
        setSelectedTemplateId('')
      } catch {
        toast.error('Failed to send bulk SMS')
      }
    } else {
      if (!phone.trim()) {
        toast.error('Please enter a phone number')
        return
      }
      try {
        await sendSms({
          workspaceId,
          to: phone.startsWith('+') ? phone : `+91${phone}`,
          message: message.trim(),
          templateId: selectedTemplateId || undefined,
        }).unwrap()
        toast.success('SMS sent successfully')
        setPhone('')
        setMessage('')
        setSelectedTemplateId('')
      } catch {
        toast.error('Failed to send SMS')
      }
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((t: any) => t._id === templateId)
    if (tpl) {
      setMessage(tpl.content)
    }
  }

  const openNewTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ name: '', content: '', type: 'transactional' })
    setTemplateSheetOpen(true)
  }

  const openEditTemplate = (tpl: any) => {
    setEditingTemplate(tpl)
    setTemplateForm({
      name: tpl.name,
      content: tpl.content,
      type: tpl.type || 'transactional',
    })
    setTemplateSheetOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error('Name and content are required')
      return
    }
    try {
      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate._id,
          workspaceId,
          name: templateForm.name,
          content: templateForm.content,
        }).unwrap()
        toast.success('Template updated')
      } else {
        await createTemplate({
          workspaceId,
          name: templateForm.name,
          content: templateForm.content,
        }).unwrap()
        toast.success('Template created')
      }
      setTemplateSheetOpen(false)
    } catch {
      toast.error('Failed to save template')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate({ id, workspaceId }).unwrap()
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    }
  }

  const handleTestSms = () => {
    toast.info('Test SMS would be sent with current settings')
  }

  const handleSaveSettings = () => {
    toast.success('Settings saved')
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <div className="mb-6 flex items-center gap-3">
        <Smartphone className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">SMS</h1>
      </div>

      <Tabs
        defaultValue="compose"
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {bulkEnabled ? 'Bulk SMS' : 'Send SMS'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Bulk Send</Label>
                  <button
                    onClick={() => setBulkEnabled(!bulkEnabled)}
                    className="text-primary"
                  >
                    {bulkEnabled ? (
                      <ToggleRight className="h-7 w-7" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {bulkEnabled ? (
                  <div className="space-y-2">
                    <Label>Recipients (one number per line)</Label>
                    <Textarea
                      placeholder={'9876543210\n9876543211\n9876543212'}
                      value={bulkNumbers}
                      onChange={e => setBulkNumbers(e.target.value)}
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      {bulkNumbersList.length} recipient
                      {bulkNumbersList.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Recipient</Label>
                    <div className="flex gap-2">
                      <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                        +91
                      </div>
                      <Input
                        placeholder="9876543210"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Template (optional)</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t: any) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message</Label>
                    <span
                      className={`text-xs ${
                        message.length > 160
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {160 - message.length} chars remaining
                    </span>
                  </div>
                  <Textarea
                    placeholder="Type your message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || bulkSending}
                  className="w-full"
                >
                  {(sending || bulkSending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Send className="mr-2 h-4 w-4" />
                  {bulkEnabled
                    ? `Send to ${bulkNumbersList.length} recipients`
                    : 'Send SMS'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {['all', 'sent', 'delivered', 'failed'].map(status => (
                  <Button
                    key={status}
                    variant={logStatusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by phone..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {logsLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-muted-foreground">No SMS logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map(log => (
                  <Card key={log._id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{log.to}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {log.message.length > 80
                            ? `${log.message.slice(0, 80)}...`
                            : log.message}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <Badge
                          variant={
                            log.status === 'delivered'
                              ? 'default'
                              : log.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {log.status}
                        </Badge>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString()}{' '}
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">SMS Templates</h2>
              <Button onClick={openNewTemplate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>

            {templatesLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-muted-foreground">No templates yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((t: any) => (
                  <Card key={t._id}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-medium">{t.name}</h3>
                        <Badge variant="secondary">
                          {t.type || 'transactional'}
                        </Badge>
                      </div>
                      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                        {t.content}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditTemplate(t)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(t._id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={templateForm.name}
                    onChange={e =>
                      setTemplateForm(f => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={templateForm.type}
                    onValueChange={v =>
                      setTemplateForm(f => ({
                        ...f,
                        type: v as 'transactional' | 'promotional' | 'otp',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transactional">
                        Transactional
                      </SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="otp">OTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    value={templateForm.content}
                    onChange={e =>
                      setTemplateForm(f => ({ ...f, content: e.target.value }))
                    }
                    placeholder="SMS body content..."
                    rows={6}
                  />
                </div>
                <Button onClick={handleSaveTemplate} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>SMS Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={settingsForm.provider}
                    onValueChange={v =>
                      setSettingsForm(f => ({ ...f, provider: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msg91">MSG91</SelectItem>
                      <SelectItem value="fast2sms">Fast2SMS</SelectItem>
                      <SelectItem value="2factor">2Factor</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={settingsForm.apiKey}
                    onChange={e =>
                      setSettingsForm(f => ({ ...f, apiKey: e.target.value }))
                    }
                    placeholder="Enter API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sender ID</Label>
                  <Input
                    value={settingsForm.senderId}
                    onChange={e =>
                      setSettingsForm(f => ({ ...f, senderId: e.target.value }))
                    }
                    placeholder="e.g. MYCRM"
                    maxLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>DLT Template ID</Label>
                  <Input
                    value={settingsForm.dltTemplateId}
                    onChange={e =>
                      setSettingsForm(f => ({
                        ...f,
                        dltTemplateId: e.target.value,
                      }))
                    }
                    placeholder="Required for India"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleTestSms}>
                    <TestTube className="mr-2 h-4 w-4" />
                    Send Test SMS
                  </Button>
                  <Button onClick={handleSaveSettings}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
