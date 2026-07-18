'use client'

import { useState } from 'react'
import {
  Plus,
  Key,
  Shield,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddApiKeyModal } from '@/components/engines/AddApiKeyModal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
  useGetApiKeysQuery,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
} from '@/lib/api/enginesApi'

export default function ApiKeysPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: apiKeysData, isLoading, error } = useGetApiKeysQuery()
  const [updateApiKey, { isLoading: isUpdating }] = useUpdateApiKeyMutation()
  const [deleteApiKey, { isLoading: isDeleting }] = useDeleteApiKeyMutation()

  const apiKeys = apiKeysData?.data || []

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const handleSetDefault = async (keyId: string) => {
    await updateApiKey({ id: keyId, isDefault: true })
  }

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    await updateApiKey({ id: keyId, isActive: !currentActive })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteApiKey(deleteTarget)
    setDeleteTarget(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatLastUsed = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return formatDate(dateStr)
  }

  const activeKeys = apiKeys.filter(k => k.isActive)
  const totalExecutions = apiKeys.reduce(
    (sum, key) => sum + (key.totalUsage?.executions || 0),
    0
  )
  const totalTokens = apiKeys.reduce(
    (sum, key) => sum + (key.totalUsage?.tokensUsed || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            API Key Management
          </h1>
          <p className="text-muted-foreground">
            Manage your OpenRouter API keys for free workflow executions
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add API Key
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeKeys.length}</div>
                <p className="text-xs text-muted-foreground">
                  {apiKeys.length} total keys
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalExecutions}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {totalTokens > 0
                    ? `${(totalTokens / 1000).toFixed(0)}K`
                    : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total tokens consumed
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security:</strong> Your API keys are encrypted and stored
          securely. We never log or store your actual API keys in plain text.{' '}
          <a
            href="https://openrouter.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:underline"
          >
            Get OpenRouter API key
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {/* API Keys List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your API Keys</h2>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        )}

        {error && (
          <Alert className="border-red-200">
            <AlertDescription>
              Failed to load API keys. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && apiKeys.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No API Keys Found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                Add your OpenRouter API key to start executing workflows for
                free
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First API Key
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && apiKeys.length > 0 && (
          <div className="grid gap-4">
            {apiKeys.map(apiKey => (
              <Card key={apiKey._id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">
                          {apiKey.keyName}
                        </CardTitle>
                        {apiKey.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        <Badge
                          variant={apiKey.isActive ? 'default' : 'secondary'}
                          className={
                            apiKey.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : ''
                          }
                        >
                          {apiKey.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{apiKey.provider}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Added {formatDate(apiKey.createdAt)}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!apiKey.isDefault && (
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(apiKey._id)}
                          >
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleActive(apiKey._id, apiKey.isActive)
                          }
                        >
                          {apiKey.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteTarget(apiKey._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="flex items-center space-x-2 rounded-lg bg-muted/50 p-3">
                      <code className="flex-1 font-mono text-sm">
                        {apiKey.keyPreview}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleKeyVisibility(apiKey._id)}
                        className="h-8 w-8 p-0"
                      >
                        {showKey[apiKey._id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <div className="font-medium">Total Executions</div>
                      <div className="text-2xl font-bold">
                        {apiKey.totalUsage?.executions || 0}
                      </div>
                      <div className="text-muted-foreground">all time</div>
                    </div>
                    <div>
                      <div className="font-medium">Tokens Used</div>
                      <div className="text-2xl font-bold">
                        {(apiKey.totalUsage?.tokensUsed || 0) > 0
                          ? `${((apiKey.totalUsage?.tokensUsed || 0) / 1000).toFixed(0)}K`
                          : '0'}
                      </div>
                      <div className="text-muted-foreground">all time</div>
                    </div>
                    <div>
                      <div className="font-medium">Last Used</div>
                      <div className="text-lg font-bold">
                        {formatLastUsed(apiKey.lastUsedAt)}
                      </div>
                      <div className="text-muted-foreground">activity</div>
                    </div>
                  </div>

                  {(apiKey.totalUsage?.executions || 0) > 0 && (
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-800 dark:text-green-300">
                          Executions using your own key
                        </span>
                        <span className="font-bold text-green-600">
                          {apiKey.totalUsage.executions} free executions
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddApiKeyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? This action cannot
              be undone. Any workflows using this key will fall back to the
              platform key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
