'use client'

import { useState } from 'react'
import {
  Plus,
  Mail,
  Play,
  Pause,
  Trash2,
  Loader2,
  ArrowLeft,
  MessageCircle,
  Smartphone,
  Bot,
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
import { useAppSelector } from '@/lib/hooks'
import {
  useGetSequencesQuery,
  useCreateSequenceMutation,
  useUpdateSequenceMutation,
  useDeleteSequenceMutation,
} from '@/lib/api/emailSequencesApi'
import { CampaignFlowBuilder } from '@/components/marketing/CampaignFlowBuilder'
import { type CampaignStep } from '@/lib/api/campaignApi'

type ViewMode = 'list' | 'create'

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: Smartphone,
  ai_reply: Bot,
}

export default function EmailSequencesPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sequenceName, setSequenceName] = useState('')
  const [sequenceDescription, setSequenceDescription] = useState('')

  const { data, isLoading } = useGetSequencesQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  const [createSequence, { isLoading: creating }] = useCreateSequenceMutation()
  const [updateSequence] = useUpdateSequenceMutation()
  const [deleteSequence] = useDeleteSequenceMutation()

  const sequences = data?.sequences || []

  const handleSave = async (steps: CampaignStep[]) => {
    if (!sequenceName.trim()) {
      toast.error('Sequence name is required')
      return
    }
    const invalid = steps.some(s => {
      if (s.channel === 'email') {
        return !s.subject || !s.body
      }
      return !s.body
    })
    if (invalid) {
      toast.error(
        'Email steps need subject + body. Other steps need a message body.'
      )
      return
    }
    try {
      await createSequence({
        workspaceId: currentWorkspace?.id || '',
        name: sequenceName.trim(),
        description: sequenceDescription.trim() || undefined,
        steps: steps.map((s, i) => ({
          order: i,
          channel: s.channel,
          subject: s.subject,
          body: s.body,
          delayDays: s.delayDays,
          delayHours: s.delayHours,
          aiTone: s.aiTone,
          aiContext: s.aiContext,
          replyViaChannel: s.replyViaChannel,
        })),
      }).unwrap()
      toast.success('Sequence created')
      setViewMode('list')
      setSequenceName('')
      setSequenceDescription('')
    } catch {
      toast.error('Failed to create sequence')
    }
  }

  const handleCancel = () => {
    setViewMode('list')
    setSequenceName('')
    setSequenceDescription('')
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateSequence({ id, status }).unwrap()
      toast.success(`Sequence ${status}`)
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSequence(id).unwrap()
      toast.success('Sequence deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'active') {
      return 'bg-primary/10 text-primary'
    }
    return 'bg-muted text-muted-foreground'
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view sequences.
          </p>
        </div>
      </div>
    )
  }

  if (viewMode === 'create') {
    return (
      <div className="flex h-full flex-col space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Sequence</h1>
            <p className="text-sm text-muted-foreground">
              Build your multi-channel sequence visually
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sequence Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sequence Name</Label>
                <Input
                  value={sequenceName}
                  onChange={e => setSequenceName(e.target.value)}
                  placeholder="e.g., Welcome Series"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={sequenceDescription}
                  onChange={e => setSequenceDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={1}
                  className="resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sequence Flow</CardTitle>
            <CardDescription>
              Add steps with any channel — Email, WhatsApp, SMS, or AI Reply
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <CampaignFlowBuilder
              onSave={handleSave}
              onCancel={handleCancel}
              saving={creating}
            />
          </CardContent>
        </Card>
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
          <h1 className="text-2xl font-bold">Sequences</h1>
          <p className="text-muted-foreground">
            Multi-channel automated sequences for your leads.
          </p>
        </div>
        <Button onClick={() => setViewMode('create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No sequences yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first sequence to automate outreach across channels.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequences.map(seq => {
            const channels = [
              ...new Set((seq.steps || []).map(s => s.channel || 'email')),
            ]
            return (
              <Card key={seq._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{seq.name}</CardTitle>
                    <Badge className={getStatusColor(seq.status)}>
                      {seq.status}
                    </Badge>
                  </div>
                  {seq.description && (
                    <CardDescription className="line-clamp-2">
                      {seq.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{seq.steps?.length || 0} steps</span>
                    <div className="flex gap-1">
                      {channels.map(ch => {
                        const Icon = channelIcons[ch] || Mail
                        return <Icon key={ch} className="h-3.5 w-3.5" />
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {seq.status === 'draft' || seq.status === 'paused' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(seq._id, 'active')}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(seq._id, 'paused')}
                      >
                        <Pause className="mr-1 h-3 w-3" />
                        Pause
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(seq._id)}
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
    </div>
  )
}
