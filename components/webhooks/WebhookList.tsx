'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Webhook,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetWebhooksQuery,
  useDeleteWebhookMutation,
  useToggleWebhookMutation,
  webhookTypeConfigs,
} from '@/lib/api/webhookApi'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

interface WebhookListProps {
  onCreateWebhook: () => void
  onEditWebhook: (webhook: any) => void
}

export function WebhookList({
  onCreateWebhook,
  onEditWebhook,
}: WebhookListProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { data: webhooksData, isLoading } = useGetWebhooksQuery(
    currentWorkspace?.id || '',
    { skip: !currentWorkspace?.id }
  )
  const [deleteWebhook] = useDeleteWebhookMutation()
  const [toggleWebhook] = useToggleWebhookMutation()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [webhookToDelete, setWebhookToDelete] = useState<any>(null)

  const webhooks = webhooksData?.webhooks || []

  const handleDeleteWebhook = async () => {
    if (!webhookToDelete) return

    try {
      await deleteWebhook(webhookToDelete.id).unwrap()
      toast.success('Webhook deleted successfully')
      setDeleteDialogOpen(false)
      setWebhookToDelete(null)
    } catch (error) {
      toast.error('Failed to delete webhook')
    }
  }

  const handleToggleWebhook = async (webhook: any) => {
    try {
      await toggleWebhook({
        id: webhook.id,
        isActive: !webhook.isActive,
      }).unwrap()
      toast.success(
        `Webhook ${webhook.isActive ? 'disabled' : 'enabled'} successfully`
      )
    } catch (error) {
      toast.error('Failed to update webhook status')
    }
  }

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Webhook URL copied to clipboard')
  }

  const getWebhookTypeConfig = (type: string) => {
    return (
      webhookTypeConfigs[type as keyof typeof webhookTypeConfigs] ||
      webhookTypeConfigs.custom
    )
  }

  const getSuccessRate = (webhook: any) => {
    if (webhook.totalRequests === 0) return 0
    return Math.round(
      (webhook.successfulRequests / webhook.totalRequests) * 100
    )
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhooks
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage webhook endpoints for receiving leads from external sources
          </p>
        </div>
        <Button onClick={onCreateWebhook}>
          <Plus className="mr-2 h-4 w-4" />
          Create Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              No webhooks configured
            </h3>
            <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
              Create your first webhook to start receiving leads from external
              sources like Facebook, Google Forms, or custom integrations.
            </p>
            <Button onClick={onCreateWebhook}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map(webhook => {
            const config = getWebhookTypeConfig(webhook.webhookType)
            const successRate = getSuccessRate(webhook)

            return (
              <Card
                key={webhook.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{webhook.name}</span>
                          <Badge
                            variant={webhook.isActive ? 'default' : 'secondary'}
                          >
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {webhook.description || config.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={webhook.isActive}
                        onCheckedChange={() => handleToggleWebhook(webhook)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onEditWebhook(webhook)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              copyWebhookUrl(webhook.webhookUrl || '')
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(config.documentation, '_blank')
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Documentation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setWebhookToDelete(webhook)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {webhook.totalRequests}
                        </p>
                        <p className="text-xs text-gray-500">Total Requests</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{successRate}%</p>
                        <p className="text-xs text-gray-500">Success Rate</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {webhook.failedRequests}
                        </p>
                        <p className="text-xs text-gray-500">Failed Requests</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {webhook.lastTriggered
                            ? formatDistanceToNow(
                                new Date(webhook.lastTriggered),
                                { addSuffix: true }
                              )
                            : 'Never'}
                        </p>
                        <p className="text-xs text-gray-500">Last Triggered</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {webhook.events.map((event: string) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{webhookToDelete?.name}
              &quot;? This action cannot be undone and will stop all incoming
              requests to this webhook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWebhook}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
