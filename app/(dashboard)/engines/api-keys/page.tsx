'use client'

import { useState } from 'react'
import { Plus, Key, Shield, ExternalLink, Trash2, Edit, Eye, EyeOff, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddApiKeyModal } from '@/components/engines/AddApiKeyModal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Mock API keys data
const mockApiKeys = [
  {
    id: '1',
    name: 'My Primary OpenRouter Key',
    provider: 'OpenRouter',
    keyPreview: 'sk-or-v1-abc...xyz',
    isDefault: true,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-01-20'),
    usage: {
      thisMonth: {
        executions: 45,
        tokens: 125000,
        cost: 0 // Customer key - no cost
      },
      allTime: {
        executions: 234,
        tokens: 650000
      }
    }
  },
  {
    id: '2',
    name: 'Secondary Key',
    provider: 'OpenRouter',
    keyPreview: 'sk-or-v1-def...abc',
    isDefault: false,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    lastUsed: new Date('2024-01-18'),
    usage: {
      thisMonth: {
        executions: 12,
        tokens: 34000,
        cost: 0
      },
      allTime: {
        executions: 67,
        tokens: 189000
      }
    }
  },
  {
    id: '3',
    name: 'Test Key',
    provider: 'OpenRouter',
    keyPreview: 'sk-or-v1-ghi...def',
    isDefault: false,
    isActive: false,
    createdAt: new Date('2024-01-05'),
    lastUsed: new Date('2024-01-12'),
    usage: {
      thisMonth: {
        executions: 3,
        tokens: 8500,
        cost: 0
      },
      allTime: {
        executions: 15,
        tokens: 42000
      }
    }
  }
]

export default function ApiKeysPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<any>(null)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatLastUsed = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return formatDate(date)
  }

  const totalExecutions = mockApiKeys.reduce((sum, key) => sum + key.usage.thisMonth.executions, 0)
  const totalTokens = mockApiKeys.reduce((sum, key) => sum + key.usage.thisMonth.tokens, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Key Management</h1>
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

      {/* Usage Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockApiKeys.filter(k => k.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              {mockApiKeys.length} total keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              Executions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalTokens / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">
              Total tokens consumed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security:</strong> Your API keys are encrypted and stored securely.
          We never log or store your actual API keys in plain text.
          {' '}
          <a
            href="https://openrouter.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center"
          >
            Get OpenRouter API key
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {/* API Keys List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your API Keys</h2>

        {mockApiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your OpenRouter API key to start executing workflows for free
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mockApiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                        {apiKey.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        <Badge
                          variant={apiKey.isActive ? "default" : "secondary"}
                          className={apiKey.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : ""}
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
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {apiKey.isDefault ? 'Remove as Default' : 'Set as Default'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {apiKey.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* API Key Display */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-3">
                      <code className="flex-1 text-sm font-mono">
                        {showKey[apiKey.id] ? 'sk-or-v1-abcdef123456789...' : apiKey.keyPreview}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="h-8 w-8 p-0"
                      >
                        {showKey[apiKey.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">This Month</div>
                      <div className="text-2xl font-bold">{apiKey.usage.thisMonth.executions}</div>
                      <div className="text-muted-foreground">executions</div>
                    </div>
                    <div>
                      <div className="font-medium">Tokens Used</div>
                      <div className="text-2xl font-bold">{(apiKey.usage.thisMonth.tokens / 1000).toFixed(0)}K</div>
                      <div className="text-muted-foreground">this month</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Usage</div>
                      <div className="text-2xl font-bold">{apiKey.usage.allTime.executions}</div>
                      <div className="text-muted-foreground">all time</div>
                    </div>
                    <div>
                      <div className="font-medium">Last Used</div>
                      <div className="text-2xl font-bold text-sm">{formatLastUsed(apiKey.lastUsed)}</div>
                      <div className="text-muted-foreground">activity</div>
                    </div>
                  </div>

                  {/* Cost Savings */}
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-800 dark:text-green-300">
                        💰 Money saved using your API key
                      </span>
                      <span className="font-bold text-green-600">
                        ${(apiKey.usage.thisMonth.executions * 0.12).toFixed(2)} this month
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add API Key Modal */}
      <AddApiKeyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  )
}

function Label({ className, children, ...props }: any) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  )
}