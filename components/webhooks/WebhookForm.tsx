'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save, X, Info, Copy, ExternalLink, Settings, Code } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import {
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  webhookTypeConfigs,
  availableEvents,
  type Webhook,
} from '@/lib/api/webhookApi'
import { toast } from 'sonner'

const webhookFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  webhookType: z.enum([
    'facebook_leads',
    'google_forms',
    'zapier',
    'custom',
    'mailchimp',
    'hubspot',
    'salesforce',
    'swipepages',
  ]),
  events: z.array(z.string()).min(1, 'At least one event must be selected'),
  retryConfig: z
    .object({
      maxRetries: z.number().min(0).max(10),
      retryDelay: z.number().min(100).max(60000),
    })
    .optional(),
})

type WebhookFormData = z.infer<typeof webhookFormSchema>

interface WebhookFormProps {
  open: boolean
  onClose: () => void
  webhook?: Webhook | null
}

export function WebhookForm({ open, onClose, webhook }: WebhookFormProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [createWebhook, { isLoading: isCreating }] = useCreateWebhookMutation()
  const [updateWebhook, { isLoading: isUpdating }] = useUpdateWebhookMutation()

  const [selectedType, setSelectedType] = useState<string>('custom')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'lead.created',
  ])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: '',
      description: '',
      webhookType: 'custom',
      events: ['lead.created'],
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
      },
    },
  })

  const isEditing = !!webhook
  const isLoading = isCreating || isUpdating

  useEffect(() => {
    if (webhook) {
      setValue('name', webhook.name)
      setValue('description', webhook.description || '')
      setValue('webhookType', webhook.webhookType)
      setValue('events', webhook.events)
      setValue('retryConfig', webhook.retryConfig)
      setSelectedType(webhook.webhookType)
      setSelectedEvents(webhook.events)
      setGeneratedUrl(webhook.webhookUrl || '')
    } else {
      reset()
      setSelectedType('custom')
      setSelectedEvents(['lead.created'])
      setGeneratedUrl('')
    }
  }, [webhook, setValue, reset])

  const onSubmit = async (data: WebhookFormData) => {
    if (!currentWorkspace?.id) {
      toast.error('No workspace selected')
      return
    }

    try {
      if (isEditing && webhook) {
        const result = await updateWebhook({
          id: webhook.id,
          ...data,
          events: selectedEvents,
        }).unwrap()
        toast.success('Webhook updated successfully')
        if (result.webhook?.webhookUrl) {
          setGeneratedUrl(result.webhook.webhookUrl)
        }
      } else {
        const result = await createWebhook({
          ...data,
          workspaceId: currentWorkspace.id,
          events: selectedEvents,
        }).unwrap()
        toast.success('Webhook created successfully')
        if (result.webhook?.webhookUrl) {
          setGeneratedUrl(result.webhook.webhookUrl)
        }
        if (result.webhook?.secret) {
          // Show the secret to the user (only shown once)
          toast.info(`Webhook secret: ${result.webhook.secret}`, {
            duration: 10000,
            description: 'Save this secret - it will not be shown again!',
          })
        }
      }
      onClose()
    } catch (error) {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} webhook`)
    }
  }

  const handleEventToggle = (eventValue: string, checked: boolean) => {
    if (checked) {
      setSelectedEvents(prev => [...prev, eventValue])
    } else {
      setSelectedEvents(prev => prev.filter(e => e !== eventValue))
    }
    setValue('events', selectedEvents)
  }

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    setValue('webhookType', type as any)

    // Set default events based on webhook type
    const config = webhookTypeConfigs[type as keyof typeof webhookTypeConfigs]
    if (config) {
      setSelectedEvents(config.events)
      setValue('events', config.events)
    }
  }

  const copyUrl = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl)
      toast.success('Webhook URL copied to clipboard')
    }
  }

  const selectedConfig =
    webhookTypeConfigs[selectedType as keyof typeof webhookTypeConfigs]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Webhook' : 'Create New Webhook'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your webhook configuration'
              : 'Set up a new webhook to receive leads from external sources'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Webhook Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Facebook Lead Ads - Summer Campaign"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Brief description of this webhook's purpose"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="webhookType">Webhook Type</Label>
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select webhook type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(webhookTypeConfigs).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <span>{config.icon}</span>
                          <span>{config.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedConfig && (
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedConfig.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Events</CardTitle>
              <CardDescription>
                Select which events should trigger this webhook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableEvents.map(event => (
                  <div key={event.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={event.value}
                      checked={selectedEvents.includes(event.value)}
                      onCheckedChange={checked =>
                        handleEventToggle(event.value, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor={event.value} className="font-medium">
                        {event.label}
                      </Label>
                      <p className="text-sm text-gray-600">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {errors.events && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.events.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Advanced Configuration */}
          <Card>
            <CardHeader>
              <CardTitle
                className="flex cursor-pointer items-center text-lg"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Advanced Configuration
                <Button variant="ghost" size="sm" className="ml-auto">
                  {showAdvanced ? 'Hide' : 'Show'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRetries">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min="0"
                      max="10"
                      {...register('retryConfig.maxRetries', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
                    <Input
                      id="retryDelay"
                      type="number"
                      min="100"
                      max="60000"
                      {...register('retryConfig.retryDelay', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Generated URL (for existing webhooks) */}
          {generatedUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Code className="mr-2 h-4 w-4" />
                  Webhook URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Input
                    value={generatedUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Use this URL as the webhook endpoint in your external service
                </p>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Saving...'
                : isEditing
                  ? 'Update Webhook'
                  : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
