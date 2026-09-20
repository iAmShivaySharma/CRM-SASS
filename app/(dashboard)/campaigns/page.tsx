'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  Megaphone,
  Play,
  Pause,
  Trash2,
  Loader2,
  Users,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Clock,
  Eye,
  XCircle,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
} from '@/lib/api/campaignApi'
import {
  useGetLeadsQuery,
  useGetLeadStatusesQuery,
  useGetTagsQuery,
  type Lead,
} from '@/lib/api/mongoApi'
import { useGetSequencesQuery } from '@/lib/api/emailSequencesApi'
import {
  useGetTemplatesQuery,
  type WhatsAppTemplate,
} from '@/lib/api/whatsappApi'

interface CampaignForm {
  name: string
  channel: 'email' | 'whatsapp' | 'sms'
  description: string
  messageType: 'template' | 'custom' | 'sequence'
  templateName: string
  sequenceId: string
  subject: string
  body: string
  audienceType: 'filter_leads' | 'manual'
  filters: {
    statusId: string
    tags: string[]
    source: string
    search: string
    dateFrom: string
    dateTo: string
  }
  manualRecipients: string
  scheduledAt: string
  previewLeads: Array<{
    id: string
    name: string
    email?: string
    phone?: string
  }>
  previewCount: number
}

const defaultForm: CampaignForm = {
  name: '',
  channel: 'email',
  description: '',
  messageType: 'custom',
  templateName: '',
  sequenceId: '',
  subject: '',
  body: '',
  audienceType: 'filter_leads',
  filters: {
    statusId: '',
    tags: [],
    source: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  },
  manualRecipients: '',
  scheduledAt: '',
  previewLeads: [],
  previewCount: 0,
}

type ViewMode = 'list' | 'create' | 'results'

export default function CampaignsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [wizardStep, setWizardStep] = useState(1)
  const [form, setForm] = useState<CampaignForm>({ ...defaultForm })
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [resultsCampaignId, setResultsCampaignId] = useState<string | null>(
    null
  )
  const [previewRequested, setPreviewRequested] = useState(false)
  const [launching, setLaunching] = useState(false)

  const { data: campaignsData, isLoading } = useGetCampaignsQuery(
    { workspaceId },
    { skip: !workspaceId }
  )
  const [createCampaign] = useCreateCampaignMutation()
  const [updateCampaign] = useUpdateCampaignMutation()
  const [deleteCampaign] = useDeleteCampaignMutation()

  const { data: statusesData } = useGetLeadStatusesQuery(workspaceId, {
    skip: !workspaceId,
  })
  const { data: tagsData } = useGetTagsQuery(workspaceId, {
    skip: !workspaceId,
  })
  const { data: sequencesData } = useGetSequencesQuery(
    { workspaceId },
    { skip: !workspaceId }
  )
  const { data: templatesData } = useGetTemplatesQuery(
    { workspaceId },
    { skip: !workspaceId || form.channel !== 'whatsapp' }
  )

  const leadsQueryArgs = useMemo(() => {
    if (!previewRequested || form.audienceType !== 'filter_leads') return null
    return {
      workspaceId,
      statusId: form.filters.statusId || undefined,
      tags:
        form.filters.tags.length > 0 ? form.filters.tags.join(',') : undefined,
      source: form.filters.source || undefined,
      search: form.filters.search || undefined,
      dateFrom: form.filters.dateFrom || undefined,
      dateTo: form.filters.dateTo || undefined,
      limit: 10,
      page: 1,
    }
  }, [previewRequested, form.audienceType, form.filters, workspaceId])

  const leadsCountQueryArgs = useMemo(() => {
    if (!previewRequested || form.audienceType !== 'filter_leads') return null
    return {
      workspaceId,
      statusId: form.filters.statusId || undefined,
      tags:
        form.filters.tags.length > 0 ? form.filters.tags.join(',') : undefined,
      source: form.filters.source || undefined,
      search: form.filters.search || undefined,
      dateFrom: form.filters.dateFrom || undefined,
      dateTo: form.filters.dateTo || undefined,
      limit: 1000,
      page: 1,
    }
  }, [previewRequested, form.audienceType, form.filters, workspaceId])

  const { data: leadsPreviewData, isFetching: fetchingPreview } =
    useGetLeadsQuery(leadsQueryArgs as any, { skip: !leadsQueryArgs })

  const { data: leadsCountData } = useGetLeadsQuery(
    leadsCountQueryArgs as any,
    { skip: !leadsCountQueryArgs }
  )

  const campaigns = campaignsData?.campaigns || []
  const statuses = statusesData?.statuses || []
  const tags = tagsData?.tags || []
  const sequences = sequencesData?.sequences || []
  const approvedTemplates = (templatesData?.templates || []).filter(
    (t: WhatsAppTemplate) => t.status === 'APPROVED'
  )

  const previewLeads = leadsPreviewData?.leads || []
  const totalMatchedLeads =
    leadsCountData?.pagination?.total || leadsCountData?.leads?.length || 0

  const updateForm = (updates: Partial<CampaignForm>) => {
    setForm(prev => ({ ...prev, ...updates }))
  }

  const updateFilters = (updates: Partial<CampaignForm['filters']>) => {
    setForm(prev => ({
      ...prev,
      filters: { ...prev.filters, ...updates },
    }))
    setPreviewRequested(false)
  }

  const handlePreviewAudience = () => {
    setPreviewRequested(true)
  }

  const resetWizard = () => {
    setForm({ ...defaultForm })
    setWizardStep(1)
    setScheduleMode('now')
    setPreviewRequested(false)
    setViewMode('list')
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign({ id, status }).unwrap()
      toast.success(`Campaign ${status}`)
    } catch {
      toast.error('Failed to update campaign')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id).unwrap()
      toast.success('Campaign deleted')
    } catch {
      toast.error('Failed to delete campaign')
    }
  }

  const getAudienceEntries = (): Array<{
    email?: string
    phone?: string
    leadId?: string
  }> => {
    if (form.audienceType === 'manual') {
      const lines = form.manualRecipients
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
      return lines.map(line => {
        if (line.includes('@')) {
          return { email: line }
        }
        return { phone: line }
      })
    }
    return previewLeads.map((lead: Lead) => ({
      leadId: lead.id,
      email: lead.email,
      phone: lead.phone,
    }))
  }

  const getAudienceCount = () => {
    if (form.audienceType === 'manual') {
      return form.manualRecipients
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean).length
    }
    return totalMatchedLeads
  }

  const handleLaunch = async () => {
    if (!form.name.trim()) {
      toast.error('Campaign name is required')
      return
    }

    setLaunching(true)
    try {
      if (form.messageType === 'sequence' && form.sequenceId) {
        const audienceEntries = getAudienceEntries()
        for (const entry of audienceEntries) {
          await fetch(`/api/email-sequences/${form.sequenceId}/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              leadId: entry.leadId,
              contactId: undefined,
            }),
          })
        }
        toast.success(`Enrolled ${audienceEntries.length} contacts in sequence`)
        resetWizard()
        return
      }

      const steps = []
      if (form.channel === 'email') {
        steps.push({
          order: 0,
          channel: 'email' as const,
          subject: form.subject,
          body: form.body,
          delayDays: 0,
          delayHours: 0,
        })
      } else if (form.channel === 'whatsapp') {
        steps.push({
          order: 0,
          channel: 'whatsapp' as const,
          body: form.templateName || form.body,
          delayDays: 0,
          delayHours: 0,
        })
      } else {
        steps.push({
          order: 0,
          channel: 'sms' as const,
          body: form.body,
          delayDays: 0,
          delayHours: 0,
        })
      }

      const result = await createCampaign({
        workspaceId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        steps,
      }).unwrap()

      const campaignId = result.campaign._id

      if (scheduleMode === 'now') {
        await updateCampaign({ id: campaignId, status: 'active' }).unwrap()
      }

      const audienceEntries = getAudienceEntries()
      if (audienceEntries.length > 0) {
        await fetch(`/api/campaigns/${campaignId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, entries: audienceEntries }),
        })
      }

      toast.success('Campaign launched successfully')
      resetWizard()
    } catch {
      toast.error('Failed to launch campaign')
    } finally {
      setLaunching(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary/10 text-primary'
      case 'paused':
        return 'bg-muted text-muted-foreground'
      case 'completed':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3.5 w-3.5" />
      case 'whatsapp':
        return <MessageSquare className="h-3.5 w-3.5" />
      case 'sms':
        return <Phone className="h-3.5 w-3.5" />
      default:
        return <Megaphone className="h-3.5 w-3.5" />
    }
  }

  const selectedTemplate = approvedTemplates.find(
    (t: WhatsAppTemplate) => t.name === form.templateName
  )

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view campaigns.
          </p>
        </div>
      </div>
    )
  }

  if (viewMode === 'results' && resultsCampaignId) {
    const campaign = campaigns.find(c => c._id === resultsCampaignId)
    if (!campaign) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Campaign not found</p>
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewMode('list')
              setResultsCampaignId(null)
            }}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">Campaign Results</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{campaign.enrolledCount}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{campaign.completedCount}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Replied</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="font-medium">Status:</span>
              <Badge className={getStatusBadgeClass(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <div className="flex gap-2">
                <span className="font-medium">Description:</span>
                <span className="text-muted-foreground">
                  {campaign.description}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-medium">Channel:</span>
              <span className="text-muted-foreground">
                {campaign.steps?.[0]?.channel || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetWizard}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Campaign</h1>
            <p className="text-sm text-muted-foreground">
              Step {wizardStep} of 4
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full ${
                step <= wizardStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {wizardStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Set the basics for your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  placeholder="e.g., Black Friday Sale"
                />
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v: 'email' | 'whatsapp' | 'sms') => {
                    updateForm({
                      channel: v,
                      messageType: 'custom',
                      templateName: '',
                      body: '',
                      subject: '',
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                      </span>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> WhatsApp
                      </span>
                    </SelectItem>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> SMS
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                  placeholder="Brief description of this campaign"
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (!form.name.trim()) {
                      toast.error('Campaign name is required')
                      return
                    }
                    setWizardStep(2)
                  }}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {wizardStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>
                Define the message to send to your audience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select
                  value={form.messageType}
                  onValueChange={(v: 'template' | 'custom' | 'sequence') =>
                    updateForm({
                      messageType: v,
                      templateName: '',
                      sequenceId: '',
                      body: '',
                      subject: '',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Message</SelectItem>
                    {form.channel === 'whatsapp' && (
                      <SelectItem value="template">
                        WhatsApp Template
                      </SelectItem>
                    )}
                    <SelectItem value="sequence">Enroll in Sequence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.messageType === 'template' &&
                form.channel === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Template</Label>
                      <Select
                        value={form.templateName}
                        onValueChange={v => updateForm({ templateName: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTemplates.map((t: WhatsAppTemplate) => (
                            <SelectItem key={t._id} value={t.name}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedTemplate && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4 text-sm">
                          {selectedTemplate.headerContent && (
                            <p className="mb-2 font-medium">
                              {selectedTemplate.headerContent}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">
                            {selectedTemplate.bodyText}
                          </p>
                          {selectedTemplate.footerText && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {selectedTemplate.footerText}
                            </p>
                          )}
                          {selectedTemplate.buttons &&
                            selectedTemplate.buttons.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {selectedTemplate.buttons.map((btn, i) => (
                                  <Badge key={i} variant="outline">
                                    {btn.text}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

              {form.messageType === 'custom' && (
                <div className="space-y-4">
                  {form.channel === 'email' && (
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={form.subject}
                        onChange={e => updateForm({ subject: e.target.value })}
                        placeholder="Email subject line"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        {form.channel === 'email' ? 'Body' : 'Message'}
                      </Label>
                      {form.channel === 'sms' && (
                        <span className="text-xs text-muted-foreground">
                          {form.body.length}/160
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={form.body}
                      onChange={e => {
                        if (
                          form.channel === 'sms' &&
                          e.target.value.length > 160
                        ) {
                          return
                        }
                        updateForm({ body: e.target.value })
                      }}
                      placeholder={
                        form.channel === 'email'
                          ? 'Compose your email body...'
                          : form.channel === 'sms'
                            ? 'Type your SMS message...'
                            : 'Type your WhatsApp message...'
                      }
                      rows={form.channel === 'email' ? 8 : 4}
                    />
                  </div>
                </div>
              )}

              {form.messageType === 'sequence' && (
                <div className="space-y-2">
                  <Label>Select Sequence</Label>
                  <Select
                    value={form.sequenceId}
                    onValueChange={v => updateForm({ sequenceId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a sequence" />
                    </SelectTrigger>
                    <SelectContent>
                      {sequences.map(seq => (
                        <SelectItem key={seq._id} value={seq._id}>
                          <span className="flex items-center gap-2">
                            {seq.name}
                            <Badge variant="outline" className="text-xs">
                              {seq.steps.length} steps
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.sequenceId && (
                    <p className="text-xs text-muted-foreground">
                      All audience members will be enrolled in this sequence
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (
                      form.messageType === 'custom' &&
                      !form.body.trim() &&
                      form.channel !== 'email'
                    ) {
                      toast.error('Message body is required')
                      return
                    }
                    if (
                      form.messageType === 'custom' &&
                      form.channel === 'email' &&
                      !form.subject.trim()
                    ) {
                      toast.error('Email subject is required')
                      return
                    }
                    if (form.messageType === 'template' && !form.templateName) {
                      toast.error('Please select a template')
                      return
                    }
                    if (form.messageType === 'sequence' && !form.sequenceId) {
                      toast.error('Please select a sequence')
                      return
                    }
                    setWizardStep(3)
                  }}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {wizardStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Audience</CardTitle>
              <CardDescription>
                Choose who receives this campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={form.audienceType}
                onValueChange={v =>
                  updateForm({ audienceType: v as 'filter_leads' | 'manual' })
                }
              >
                <TabsList>
                  <TabsTrigger value="filter_leads">Filter Leads</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>

                <TabsContent value="filter_leads" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={form.filters.statusId}
                        onValueChange={v =>
                          updateFilters({ statusId: v === 'all' ? '' : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          {statuses.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={form.filters.source || 'all'}
                        onValueChange={v =>
                          updateFilters({ source: v === 'all' ? '' : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sources</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="social_media">
                            Social Media
                          </SelectItem>
                          <SelectItem value="advertisement">
                            Advertisement
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <Select
                        value={form.filters.tags[0] || 'all'}
                        onValueChange={v => {
                          if (v === 'all') {
                            updateFilters({ tags: [] })
                          } else {
                            const currentTags = form.filters.tags
                            if (currentTags.includes(v)) {
                              updateFilters({
                                tags: currentTags.filter(t => t !== v),
                              })
                            } else {
                              updateFilters({ tags: [...currentTags, v] })
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All tags" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All tags</SelectItem>
                          {tags.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.filters.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {form.filters.tags.map(tagId => {
                            const tag = tags.find(t => t.id === tagId)
                            return (
                              <Badge
                                key={tagId}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() =>
                                  updateFilters({
                                    tags: form.filters.tags.filter(
                                      t => t !== tagId
                                    ),
                                  })
                                }
                              >
                                {tag?.name || tagId}
                                <XCircle className="ml-1 h-3 w-3" />
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={form.filters.search}
                          onChange={e =>
                            updateFilters({ search: e.target.value })
                          }
                          placeholder="Name, email, or phone"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Created After</Label>
                      <Input
                        type="date"
                        value={form.filters.dateFrom}
                        onChange={e =>
                          updateFilters({ dateFrom: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Created Before</Label>
                      <Input
                        type="date"
                        value={form.filters.dateTo}
                        onChange={e =>
                          updateFilters({ dateTo: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handlePreviewAudience}
                    disabled={fetchingPreview}
                  >
                    {fetchingPreview ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Preview Audience
                  </Button>

                  {previewRequested && !fetchingPreview && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">
                        {totalMatchedLeads} leads matched
                      </p>
                      {previewLeads.length > 0 && (
                        <div className="rounded-md border">
                          <div className="grid grid-cols-3 gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                            <span>Name</span>
                            <span>Email</span>
                            <span>Phone</span>
                          </div>
                          {previewLeads.map((lead: Lead) => (
                            <div
                              key={lead.id}
                              className="grid grid-cols-3 gap-4 border-b px-4 py-2 text-sm last:border-0"
                            >
                              <span className="truncate">{lead.name}</span>
                              <span className="truncate text-muted-foreground">
                                {lead.email || '-'}
                              </span>
                              <span className="truncate text-muted-foreground">
                                {lead.phone || '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      {form.channel === 'email'
                        ? 'Email Addresses (one per line)'
                        : 'Phone Numbers (one per line)'}
                    </Label>
                    <Textarea
                      value={form.manualRecipients}
                      onChange={e =>
                        updateForm({ manualRecipients: e.target.value })
                      }
                      placeholder={
                        form.channel === 'email'
                          ? 'john@example.com\njane@example.com'
                          : '+1234567890\n+0987654321'
                      }
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      {
                        form.manualRecipients.split('\n').filter(l => l.trim())
                          .length
                      }{' '}
                      recipients entered
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    const count = getAudienceCount()
                    if (count === 0) {
                      toast.error('Please add at least one recipient')
                      return
                    }
                    setWizardStep(4)
                  }}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {wizardStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Schedule</CardTitle>
              <CardDescription>
                Review your campaign before launching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Campaign Name
                  </p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Channel
                  </p>
                  <div className="flex items-center gap-2">
                    {getChannelIcon(form.channel)}
                    <span className="capitalize">{form.channel}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Message Type
                  </p>
                  <p className="capitalize">{form.messageType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Audience
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {getAudienceCount()} recipients
                  </p>
                </div>
              </div>

              {form.messageType === 'custom' && form.body && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Message Preview
                  </p>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 text-sm">
                      {form.subject && (
                        <p className="mb-2 font-medium">{form.subject}</p>
                      )}
                      <p className="whitespace-pre-wrap">{form.body}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {form.messageType === 'template' && selectedTemplate && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Template Preview
                  </p>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 text-sm">
                      <p className="mb-1 font-medium">
                        {selectedTemplate.name}
                      </p>
                      <p className="whitespace-pre-wrap">
                        {selectedTemplate.bodyText}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {form.messageType === 'sequence' && form.sequenceId && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Sequence
                  </p>
                  <p>
                    {sequences.find(s => s._id === form.sequenceId)?.name ||
                      'Unknown sequence'}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Label>Schedule</Label>
                <div className="flex gap-3">
                  <Button
                    variant={scheduleMode === 'now' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setScheduleMode('now')
                      updateForm({ scheduledAt: '' })
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send Now
                  </Button>
                  <Button
                    variant={scheduleMode === 'later' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScheduleMode('later')}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule for Later
                  </Button>
                </div>
                {scheduleMode === 'later' && (
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => updateForm({ scheduledAt: e.target.value })}
                  />
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleLaunch} disabled={launching}>
                  {launching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Launch Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Bulk marketing campaigns for your audience.
          </p>
        </div>
        <Button onClick={() => setViewMode('create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first campaign to reach your audience.
            </p>
            <Button onClick={() => setViewMode('create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map(campaign => (
            <Card key={campaign._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  <Badge className={getStatusBadgeClass(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
                {campaign.description && (
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getChannelIcon(campaign.steps?.[0]?.channel || '')}
                    {campaign.steps?.[0]?.channel || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {campaign.enrolledCount} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {campaign.completedCount} sent
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResultsCampaignId(campaign._id)
                      setViewMode('results')
                    }}
                  >
                    <BarChart3 className="mr-1 h-3 w-3" />
                    Results
                  </Button>
                  {campaign.status === 'draft' ||
                  campaign.status === 'paused' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(campaign._id, 'active')}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Activate
                    </Button>
                  ) : campaign.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(campaign._id, 'paused')}
                    >
                      <Pause className="mr-1 h-3 w-3" />
                      Pause
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(campaign._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
