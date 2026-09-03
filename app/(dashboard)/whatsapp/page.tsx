'use client'

import { useState } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useDeleteTemplateMutation,
  useSubmitTemplateMutation,
  useSyncTemplatesMutation,
  useGetConversationsQuery,
  useBroadcastMutation,
} from '@/lib/api/whatsappApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  Send,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
  Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppChatThread } from '@/components/whatsapp/WhatsAppChatThread'

interface ButtonField {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  url?: string
  phone?: string
}

interface TemplateForm {
  name: string
  category: string
  language: string
  headerType: string
  headerContent: string
  body: string
  footer: string
  buttons: ButtonField[]
}

function emptyTemplateForm(): TemplateForm {
  return {
    name: '',
    category: 'MARKETING',
    language: 'en',
    headerType: 'NONE',
    headerContent: '',
    body: '',
    footer: '',
    buttons: [],
  }
}

function templateStatusClass(status: string): string {
  if (status === 'APPROVED') {
    return 'bg-primary/10 text-primary'
  }
  if (status === 'REJECTED') {
    return 'bg-destructive/10 text-destructive'
  }
  return 'bg-muted text-muted-foreground'
}

function formatRelativeTime(iso?: string): string {
  if (!iso) {
    return ''
  }
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) {
    return 'just now'
  }
  if (mins < 60) {
    return `${mins}m ago`
  }
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) {
    return `${hrs}h ago`
  }
  return `${Math.floor(hrs / 24)}d ago`
}

export default function WhatsAppPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id ?? ''

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  )
  const [selectedAccountPhone, setSelectedAccountPhone] = useState<string>('')
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)
  const [templateForm, setTemplateForm] =
    useState<TemplateForm>(emptyTemplateForm())
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [accountForm, setAccountForm] = useState({
    name: '',
    phoneNumber: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
    botEnabled: false,
    botContext: '',
    botTone: 'professional' as 'professional' | 'friendly' | 'casual',
  })
  const [broadcastForm, setBroadcastForm] = useState({
    accountId: '',
    templateName: '',
    language: 'en',
    recipients: '',
  })
  const [broadcastResult, setBroadcastResult] = useState<{
    sent?: number
    failed?: number
  } | null>(null)

  const { data: accountsData, isLoading: accountsLoading } =
    useGetAccountsQuery({ workspaceId }, { skip: !currentWorkspace })
  const { data: templatesData, isLoading: templatesLoading } =
    useGetTemplatesQuery({ workspaceId }, { skip: !currentWorkspace })
  const { data: conversationsData, isLoading: conversationsLoading } =
    useGetConversationsQuery(
      { workspaceId },
      { skip: !currentWorkspace, pollingInterval: 15000 }
    )

  const [createAccount, { isLoading: creatingAccount }] =
    useCreateAccountMutation()
  const [updateAccount, { isLoading: updatingAccount }] =
    useUpdateAccountMutation()
  const [deleteAccount] = useDeleteAccountMutation()
  const [createTemplate, { isLoading: creatingTemplate }] =
    useCreateTemplateMutation()
  const [deleteTemplate] = useDeleteTemplateMutation()
  const [submitTemplate] = useSubmitTemplateMutation()
  const [syncTemplates, { isLoading: syncing }] = useSyncTemplatesMutation()
  const [broadcast, { isLoading: broadcasting }] = useBroadcastMutation()

  const accounts = accountsData?.accounts ?? []
  const templates = templatesData?.templates ?? []
  const conversations = conversationsData?.conversations ?? []

  const selectedConversation = conversations.find(
    c => c.contactPhone === selectedPhone
  )

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleSyncTemplates() {
    if (accounts.length === 0) {
      toast.error('No accounts connected')
      return
    }
    try {
      const result = await syncTemplates({
        workspaceId,
        accountId: accounts[0]._id,
      }).unwrap()
      toast.success(`Synced ${result.synced} templates`)
    } catch {
      toast.error('Failed to sync templates')
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await deleteTemplate({ id, workspaceId }).unwrap()
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    }
  }

  async function handleSubmitTemplate(id: string) {
    try {
      await submitTemplate({ id, workspaceId }).unwrap()
      toast.success('Template submitted to Meta')
    } catch {
      toast.error('Failed to submit template')
    }
  }

  async function handleCreateTemplate() {
    const components: object[] = []
    if (templateForm.headerType !== 'NONE') {
      if (templateForm.headerType === 'TEXT') {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: templateForm.headerContent,
        })
      } else {
        components.push({ type: 'HEADER', format: templateForm.headerType })
      }
    }
    if (templateForm.body) {
      components.push({ type: 'BODY', text: templateForm.body })
    }
    if (templateForm.footer) {
      components.push({ type: 'FOOTER', text: templateForm.footer })
    }
    if (templateForm.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: templateForm.buttons.map(b => {
          if (b.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: b.text }
          }
          if (b.type === 'URL') {
            return { type: 'URL', text: b.text, url: b.url }
          }
          return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone }
        }),
      })
    }
    try {
      await createTemplate({
        workspaceId,
        name: templateForm.name,
        category: templateForm.category,
        language: templateForm.language,
        components,
      }).unwrap()
      toast.success('Template created')
      setTemplateSheetOpen(false)
      setTemplateForm(emptyTemplateForm())
    } catch {
      toast.error('Failed to create template')
    }
  }

  function openNewAccount() {
    setEditingAccountId(null)
    setAccountForm({
      name: '',
      phoneNumber: '',
      phoneNumberId: '',
      businessAccountId: '',
      accessToken: '',
      webhookVerifyToken: '',
      botEnabled: false,
      botContext: '',
      botTone: 'professional',
    })
    setAccountFormOpen(true)
  }

  function openEditAccount(account: (typeof accounts)[0]) {
    setEditingAccountId(account._id)
    setAccountForm({
      name: account.name,
      phoneNumber: account.phoneNumber,
      phoneNumberId: account.phoneNumberId,
      businessAccountId: account.businessAccountId ?? '',
      accessToken: account.accessToken,
      webhookVerifyToken: account.webhookVerifyToken ?? '',
      botEnabled: account.botEnabled ?? false,
      botContext: account.botContext ?? '',
      botTone: account.botTone ?? 'professional',
    })
    setAccountFormOpen(true)
  }

  async function handleSaveAccount() {
    try {
      if (editingAccountId) {
        await updateAccount({
          id: editingAccountId,
          ...accountForm,
          workspaceId,
        }).unwrap()
        toast.success('Account updated')
      } else {
        await createAccount({ ...accountForm, workspaceId }).unwrap()
        toast.success('Account connected')
      }
      setAccountFormOpen(false)
    } catch {
      toast.error('Failed to save account')
    }
  }

  async function handleDeleteAccount(id: string) {
    try {
      await deleteAccount({ id, workspaceId }).unwrap()
      toast.success('Account disconnected')
    } catch {
      toast.error('Failed to disconnect account')
    }
  }

  async function handleBroadcast() {
    const recipients = broadcastForm.recipients
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean)
    if (recipients.length === 0) {
      toast.error('No recipients provided')
      return
    }
    try {
      const result = await broadcast({
        workspaceId,
        accountId: broadcastForm.accountId,
        recipients,
        templateName: broadcastForm.templateName,
        language: broadcastForm.language,
      }).unwrap()
      setBroadcastResult({ sent: result.count })
      toast.success(`Broadcast sent to ${result.count} recipients`)
    } catch {
      toast.error('Broadcast failed')
    }
  }

  function addButton() {
    if (templateForm.buttons.length >= 3) {
      return
    }
    setTemplateForm(f => ({
      ...f,
      buttons: [...f.buttons, { type: 'QUICK_REPLY', text: '' }],
    }))
  }

  function updateButton(idx: number, field: keyof ButtonField, value: string) {
    setTemplateForm(f => {
      const buttons = [...f.buttons]
      buttons[idx] = { ...buttons[idx], [field]: value }
      return { ...f, buttons }
    })
  }

  function removeButton(idx: number) {
    setTemplateForm(f => ({
      ...f,
      buttons: f.buttons.filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-card px-6 py-4">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">WhatsApp</h1>
      </div>

      <Tabs
        defaultValue="conversations"
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b bg-card px-6">
          <TabsList className="mt-2">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="conversations"
          className="m-0 flex-1 overflow-hidden data-[state=active]:flex"
        >
          <div className="flex h-full w-full">
            <div className="flex w-[300px] shrink-0 flex-col border-r">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">Conversations</p>
              </div>
              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No conversations yet.
                  </p>
                ) : (
                  <div className="space-y-1 p-2">
                    {conversations.map(conv => {
                      const isSelected = selectedPhone === conv.contactPhone
                      return (
                        <button
                          key={conv._id}
                          onClick={() => {
                            setSelectedPhone(conv.contactPhone)
                            setSelectedAccountId(conv.accountId)
                            const account = accounts.find(
                              a => a._id === conv.accountId
                            )
                            setSelectedAccountPhone(account?.phoneNumber ?? '')
                          }}
                          className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}
                        >
                          <div className="mb-0.5 flex items-center justify-between">
                            <span className="max-w-[160px] truncate text-sm font-medium">
                              {conv.contactName ?? conv.contactPhone}
                            </span>
                            <span className="ml-1 shrink-0 text-xs text-muted-foreground">
                              {formatRelativeTime(conv.lastMessageAt)}
                            </span>
                          </div>
                          {conv.lastMessage && (
                            <p className="truncate text-xs text-muted-foreground">
                              {conv.lastMessage}
                            </p>
                          )}
                          <span
                            className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-xs ${
                              conv.status === 'open'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {conv.status}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              {selectedPhone && selectedAccountId ? (
                <WhatsAppChatThread
                  workspaceId={workspaceId}
                  accountId={selectedAccountId}
                  phone={selectedPhone}
                  accountPhone={selectedAccountPhone}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 opacity-30" />
                  <p className="text-sm">
                    Select a conversation to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="m-0 flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Templates</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncTemplates}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync from Meta
              </Button>
              <Button size="sm" onClick={() => setTemplateSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">
                No templates yet. Create one or sync from Meta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(t => {
                const body = (
                  t.components as { type: string; text?: string }[]
                ).find(c => c.type === 'BODY')
                return (
                  <Card key={t._id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="break-all text-sm font-semibold">
                          {t.name}
                        </CardTitle>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${templateStatusClass(t.status)}`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {t.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t.language}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      {body?.text && (
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {body.text}
                        </p>
                      )}
                      <div className="mt-auto flex gap-2 pt-2">
                        {t.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => handleSubmitTemplate(t._id)}
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Submit to Meta
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteTemplate(t._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="m-0 flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected Accounts</h2>
            <Button size="sm" onClick={openNewAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Connect Account
            </Button>
          </div>

          {accountsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">No WhatsApp accounts connected yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(account => (
                <Card key={account._id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{account.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${account.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                        >
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {account.phoneNumber}
                      </p>
                      {account.businessAccountId && (
                        <p className="text-xs text-muted-foreground">
                          WABA: {account.businessAccountId}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditAccount(account)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteAccount(account._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="broadcast" className="m-0 flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Broadcast</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a template message to multiple contacts at once.
            </p>
          </div>

          <Card className="max-w-xl">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label>Account</Label>
                <Select
                  value={broadcastForm.accountId}
                  onValueChange={v =>
                    setBroadcastForm(f => ({ ...f, accountId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} — {a.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g. order_confirmation"
                  value={broadcastForm.templateName}
                  onChange={e =>
                    setBroadcastForm(f => ({
                      ...f,
                      templateName: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Language</Label>
                <Input
                  placeholder="en"
                  value={broadcastForm.language}
                  onChange={e =>
                    setBroadcastForm(f => ({ ...f, language: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Recipients</Label>
                <Textarea
                  placeholder="One phone number per line&#10;+1234567890&#10;+0987654321"
                  rows={6}
                  value={broadcastForm.recipients}
                  onChange={e =>
                    setBroadcastForm(f => ({
                      ...f,
                      recipients: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {
                    broadcastForm.recipients.split('\n').filter(r => r.trim())
                      .length
                  }{' '}
                  recipients
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleBroadcast}
                disabled={
                  broadcasting ||
                  !broadcastForm.accountId ||
                  !broadcastForm.templateName
                }
              >
                {broadcasting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Broadcast
              </Button>

              {broadcastResult && (
                <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                  <p className="font-medium">Broadcast complete</p>
                  <p>Sent: {broadcastResult.sent ?? 0}</p>
                  {broadcastResult.failed !== undefined &&
                    broadcastResult.failed > 0 && (
                      <p className="text-destructive">
                        Failed: {broadcastResult.failed}
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent
          side="right"
          className="w-[480px] overflow-y-auto sm:w-[560px]"
        >
          <SheetHeader>
            <SheetTitle>New Template</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. order_confirmation"
                value={templateForm.name}
                onChange={e =>
                  setTemplateForm(f => ({ ...f, name: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, underscores only
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={templateForm.category}
                onValueChange={v =>
                  setTemplateForm(f => ({ ...f, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Language</Label>
              <Input
                placeholder="en"
                value={templateForm.language}
                onChange={e =>
                  setTemplateForm(f => ({ ...f, language: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Header Type</Label>
              <Select
                value={templateForm.headerType}
                onValueChange={v =>
                  setTemplateForm(f => ({ ...f, headerType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateForm.headerType === 'TEXT' && (
              <div className="space-y-1.5">
                <Label>Header Content</Label>
                <Input
                  placeholder="Header text"
                  value={templateForm.headerContent}
                  onChange={e =>
                    setTemplateForm(f => ({
                      ...f,
                      headerContent: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Body Text</Label>
              <Textarea
                placeholder="Message body. Use {{1}}, {{2}} for variables."
                rows={4}
                value={templateForm.body}
                onChange={e =>
                  setTemplateForm(f => ({ ...f, body: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{1}}'}, {'{{2}}'} for variables
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                Footer Text{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Reply STOP to unsubscribe"
                value={templateForm.footer}
                onChange={e =>
                  setTemplateForm(f => ({ ...f, footer: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Buttons</Label>
                {templateForm.buttons.length < 3 && (
                  <Button size="sm" variant="outline" onClick={addButton}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Button
                  </Button>
                )}
              </div>
              {templateForm.buttons.map((btn, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Button {idx + 1}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => removeButton(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    value={btn.type}
                    onValueChange={v => updateButton(idx, 'type', v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                      <SelectItem value="URL">URL</SelectItem>
                      <SelectItem value="PHONE_NUMBER">Phone Number</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Button text"
                    value={btn.text}
                    onChange={e => updateButton(idx, 'text', e.target.value)}
                    className="h-8"
                  />
                  {btn.type === 'URL' && (
                    <Input
                      placeholder="https://example.com"
                      value={btn.url ?? ''}
                      onChange={e => updateButton(idx, 'url', e.target.value)}
                      className="h-8"
                    />
                  )}
                  {btn.type === 'PHONE_NUMBER' && (
                    <Input
                      placeholder="+1234567890"
                      value={btn.phone ?? ''}
                      onChange={e => updateButton(idx, 'phone', e.target.value)}
                      className="h-8"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setTemplateSheetOpen(false)
                  setTemplateForm(emptyTemplateForm())
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateTemplate}
                disabled={
                  creatingTemplate || !templateForm.name || !templateForm.body
                }
              >
                {creatingTemplate ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Template
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={accountFormOpen} onOpenChange={setAccountFormOpen}>
        <SheetContent side="right" className="w-[440px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingAccountId ? 'Edit Account' : 'Connect Account'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                placeholder="My Business"
                value={accountForm.name}
                onChange={e =>
                  setAccountForm(f => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={accountForm.phoneNumber}
                onChange={e =>
                  setAccountForm(f => ({ ...f, phoneNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input
                placeholder="Meta Phone Number ID"
                value={accountForm.phoneNumberId}
                onChange={e =>
                  setAccountForm(f => ({ ...f, phoneNumberId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Account ID</Label>
              <Input
                placeholder="WhatsApp Business Account ID"
                value={accountForm.businessAccountId}
                onChange={e =>
                  setAccountForm(f => ({
                    ...f,
                    businessAccountId: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder="Meta Access Token"
                value={accountForm.accessToken}
                onChange={e =>
                  setAccountForm(f => ({ ...f, accessToken: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webhook Verify Token</Label>
              <Input
                placeholder="Your webhook verify token"
                value={accountForm.webhookVerifyToken}
                onChange={e =>
                  setAccountForm(f => ({
                    ...f,
                    webhookVerifyToken: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Auto-Reply Bot</p>
                    <p className="text-xs text-muted-foreground">
                      AI replies to incoming messages via Meta Cloud API
                    </p>
                  </div>
                </div>
                <Switch
                  checked={accountForm.botEnabled}
                  onCheckedChange={v =>
                    setAccountForm(f => ({ ...f, botEnabled: v }))
                  }
                />
              </div>

              {accountForm.botEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label>Bot Tone</Label>
                    <Select
                      value={accountForm.botTone}
                      onValueChange={v =>
                        setAccountForm(f => ({
                          ...f,
                          botTone: v as 'professional' | 'friendly' | 'casual',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Business Context</Label>
                    <Textarea
                      placeholder="Pre-feed your products, FAQs, pricing, policies... The bot uses this to answer customer questions."
                      rows={4}
                      value={accountForm.botContext}
                      onChange={e =>
                        setAccountForm(f => ({
                          ...f,
                          botContext: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {accountForm.botContext.length}/2000 chars
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAccountFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveAccount}
                disabled={
                  creatingAccount ||
                  updatingAccount ||
                  !accountForm.name ||
                  !accountForm.phoneNumberId ||
                  !accountForm.accessToken
                }
              >
                {creatingAccount || updatingAccount ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingAccountId ? 'Save Changes' : 'Connect'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
