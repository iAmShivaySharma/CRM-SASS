'use client'

import { useState } from 'react'
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
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  type CampaignStep,
} from '@/lib/api/campaignApi'
import { CampaignFlowBuilder } from '@/components/marketing/CampaignFlowBuilder'

type ViewMode = 'list' | 'create'

export default function CampaignsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')

  const { data, isLoading } = useGetCampaignsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation()
  const [updateCampaign] = useUpdateCampaignMutation()
  const [deleteCampaign] = useDeleteCampaignMutation()

  const campaigns = data?.campaigns || []

  const handleSave = async (steps: CampaignStep[]) => {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required')
      return
    }
    try {
      await createCampaign({
        workspaceId: currentWorkspace?.id || '',
        name: campaignName.trim(),
        description: campaignDescription.trim() || undefined,
        steps,
      }).unwrap()
      toast.success('Campaign created')
      setViewMode('list')
      setCampaignName('')
      setCampaignDescription('')
    } catch {
      toast.error('Failed to create campaign')
    }
  }

  const handleCancel = () => {
    setViewMode('list')
    setCampaignName('')
    setCampaignDescription('')
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

  const getStatusColor = (status: string) => {
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
            <h1 className="text-2xl font-bold">New Campaign</h1>
            <p className="text-sm text-muted-foreground">
              Build your campaign flow visually
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g., Welcome Onboarding"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={campaignDescription}
                  onChange={e => setCampaignDescription(e.target.value)}
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
            <CardTitle className="text-base">Campaign Flow</CardTitle>
            <CardDescription>
              Add steps to define the sequence of messages sent to contacts
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
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Multi-channel automated campaigns for your contacts.
          </p>
        </div>
        <Button onClick={() => setViewMode('create')}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first campaign to start engaging contacts.
            </p>
            <Button onClick={() => setViewMode('create')}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
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
                  <Badge className={getStatusColor(campaign.status)}>
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
                    <Megaphone className="h-3.5 w-3.5" />
                    {campaign.steps?.length || 0} steps
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {campaign.enrolledCount} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {campaign.completedCount} done
                  </span>
                </div>
                <div className="flex gap-2">
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
