'use client'

import { useState } from 'react'
import { Key, DollarSign, Zap, Plus, Shield, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ApiKeyOption {
  id: string
  type: 'customer' | 'platform'
  name: string
  provider: string
  cost?: number
  isDefault?: boolean
  lastUsed?: Date
  usageThisMonth?: {
    executions: number
    cost: number
  }
}

interface ApiKeySelectorProps {
  workflowCost: number
  availableKeys: ApiKeyOption[]
  selectedKeyId?: string
  onKeySelect: (keyId: string) => void
  onAddNewKey?: () => void
}

export function ApiKeySelector({
  workflowCost,
  availableKeys,
  selectedKeyId,
  onKeySelect,
  onAddNewKey
}: ApiKeySelectorProps) {
  const [selectedType, setSelectedType] = useState<'customer' | 'platform'>('customer')

  const customerKeys = availableKeys.filter(key => key.type === 'customer')
  const platformKeys = availableKeys.filter(key => key.type === 'platform')

  const selectedKey = availableKeys.find(key => key.id === selectedKeyId)

  const handleTypeChange = (type: 'customer' | 'platform') => {
    setSelectedType(type)
    const keysOfType = type === 'customer' ? customerKeys : platformKeys
    if (keysOfType.length > 0) {
      onKeySelect(keysOfType[0].id)
    }
  }

  const formatLastUsed = (date?: Date) => {
    if (!date) return 'Never used'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Key className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Choose API Key</h3>
      </div>

      {/* Cost Comparison */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-800 dark:text-green-400">Your API Key</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">Free</div>
            <p className="text-xs text-green-700 dark:text-green-400">No execution charges</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-400">Platform Key</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">${workflowCost.toFixed(3)}</div>
            <p className="text-xs text-blue-700 dark:text-blue-400">Per execution</p>
          </CardContent>
        </Card>
      </div>

      {/* API Key Type Selection */}
      <RadioGroup
        value={selectedType}
        onValueChange={(value) => handleTypeChange(value as 'customer' | 'platform')}
        className="space-y-3"
      >
        {/* Customer Keys Option */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="customer" id="customer" className="mt-1" />
          <div className="flex-1 space-y-3">
            <Label htmlFor="customer" className="text-base font-medium cursor-pointer">
              Use My API Key (Free)
            </Label>

            {selectedType === 'customer' && (
              <div className="space-y-3">
                {customerKeys.length > 0 ? (
                  <Select value={selectedKeyId} onValueChange={onKeySelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your API key" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {key.provider}
                              </Badge>
                              <span>{key.name}</span>
                              {key.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground ml-4">
                              {formatLastUsed(key.lastUsed)}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      No API keys found. Add your OpenRouter API key to execute workflows for free.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddNewKey}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New API Key
                </Button>

                {selectedKey && selectedKey.type === 'customer' && selectedKey.usageThisMonth && (
                  <div className="bg-muted/30 rounded-lg p-3 text-sm">
                    <div className="font-medium mb-1">Usage This Month</div>
                    <div className="flex justify-between">
                      <span>Executions:</span>
                      <span>{selectedKey.usageThisMonth.executions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Personal Cost:</span>
                      <span className="text-green-600">$0 (Your key)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Platform Keys Option */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="platform" id="platform" className="mt-1" />
          <div className="flex-1 space-y-3">
            <Label htmlFor="platform" className="text-base font-medium cursor-pointer">
              Use Platform Key (${workflowCost.toFixed(3)} per execution)
            </Label>

            {selectedType === 'platform' && (
              <div className="space-y-3">
                {platformKeys.length > 0 ? (
                  <Select value={selectedKeyId} onValueChange={onKeySelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform key" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id}>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {key.provider}
                            </Badge>
                            <span>{key.name}</span>
                            <DollarSign className="h-3 w-3 text-green-600" />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Platform keys are automatically managed. You'll be charged for usage.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Billing Information</span>
                    <Badge variant="secondary" className="text-xs">Auto-billed</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution cost:</span>
                    <span>${workflowCost.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billed to workspace:</span>
                    <span>Monthly</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </RadioGroup>

      {/* Additional Info */}
      <div className="flex items-start space-x-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Security & Privacy</p>
          <p className="text-xs mt-1">
            Your API keys are encrypted and stored securely. Platform executions are billed monthly to your workspace.
          </p>
        </div>
      </div>
    </div>
  )
}