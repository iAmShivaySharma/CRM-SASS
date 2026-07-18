'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Play,
  Loader2,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  UserCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  useExecuteWorkflowMutation,
  useGetApiKeysQuery,
} from '@/lib/api/enginesApi'
import { ApiKeySelector } from './ApiKeySelector'
import { ExecutionOutput } from './ExecutionOutput'

interface WorkflowProp {
  id?: string
  _id?: string
  n8nWorkflowId?: string
  name: string
  description: string
  estimatedCost: number
  avgExecutionTime: number
  requiresApiKey: boolean
  inputSchema: Record<string, any>
}

interface ExecuteWorkflowModalProps {
  workflow: WorkflowProp
  isOpen: boolean
  onClose: () => void
}

export function ExecuteWorkflowModal({
  workflow,
  isOpen,
  onClose,
}: ExecuteWorkflowModalProps) {
  const router = useRouter()
  // Resolve workflow ID from any possible field name
  const workflowId = workflow.id || workflow._id || workflow.n8nWorkflowId || ''

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [selectedApiKey, setSelectedApiKey] = useState<string>('')
  const [emailResults, setEmailResults] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  const { data: apiKeysData } = useGetApiKeysQuery()
  const [
    executeWorkflow,
    {
      isLoading: isExecuting,
      data: executionResult,
      error: executionError,
      reset: resetExecution,
    },
  ] = useExecuteWorkflowMutation()

  React.useEffect(() => {
    if (isOpen) {
      const defaults: Record<string, any> = {}
      for (const [field, schema] of Object.entries(
        workflow.inputSchema || {}
      )) {
        if (schema.defaultValue !== undefined) {
          defaults[field] = schema.defaultValue
        }
      }
      setFormData(defaults)
      setEmailResults(false)
      setElapsedTime(0)
      resetExecution()
    }
  }, [isOpen, workflowId, resetExecution])

  React.useEffect(() => {
    if (!isExecuting) return
    setElapsedTime(0)
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [isExecuting])

  const customerKeys = apiKeysData?.data || []
  const allApiKeys = [
    ...customerKeys.map(key => ({
      id: key._id,
      type: 'customer' as const,
      name: key.keyName,
      provider: key.provider,
      isDefault: key.isDefault,
      lastUsed: key.lastUsedAt ? new Date(key.lastUsedAt) : undefined,
      usageThisMonth: {
        executions: key.totalUsage.executions,
        cost: 0,
      },
    })),
    {
      id: 'platform',
      type: 'platform' as const,
      name: 'Platform Key',
      provider: 'OpenRouter',
      cost: workflow.estimatedCost,
    },
  ]

  // Set default selected key
  React.useEffect(() => {
    if (allApiKeys.length > 0 && !selectedApiKey) {
      const defaultKey =
        allApiKeys.find(key => 'isDefault' in key && key.isDefault) ||
        allApiKeys[0]
      setSelectedApiKey(defaultKey.id)
    }
  }, [allApiKeys, selectedApiKey])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getExecutionCost = () => {
    const selectedKey = allApiKeys.find(key => key.id === selectedApiKey)
    return selectedKey?.type === 'customer' ? 0 : workflow.estimatedCost
  }

  const handleExecute = async () => {
    if (!selectedApiKey || !workflowId) return

    const selectedKey = allApiKeys.find(key => key.id === selectedApiKey)
    if (!selectedKey) return

    const payload = {
      workflowId,
      inputData: formData,
      apiKeyType: selectedKey.type,
      apiKeyId: selectedKey.type === 'customer' ? selectedKey.id : undefined,
      emailResults,
    }

    toast.info('Workflow started', {
      description: 'You can track progress in Execution History',
      action: {
        label: 'View History',
        onClick: () => router.push('/engines/executions'),
      },
    })

    try {
      await executeWorkflow(payload).unwrap()
      toast.success('Workflow completed', {
        description: 'Results are ready below',
      })
    } catch (error: any) {
      toast.error('Execution failed', {
        description: error?.data?.error || error?.message || 'Unknown error',
      })
    }
  }

  const renderInputField = (field: string, schema: any) => {
    const { type, required, description, options } = schema

    switch (type) {
      case 'string':
        if (
          field.toLowerCase().includes('message') ||
          field.toLowerCase().includes('content')
        ) {
          return (
            <Textarea
              placeholder={description}
              value={formData[field] || ''}
              onChange={e => handleInputChange(field, e.target.value)}
              rows={3}
            />
          )
        }
        return (
          <Input
            placeholder={description}
            value={formData[field] || ''}
            onChange={e => handleInputChange(field, e.target.value)}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={description}
            value={formData[field] || ''}
            onChange={e => handleInputChange(field, Number(e.target.value))}
          />
        )

      case 'select':
        return (
          <Select
            value={formData[field]}
            onValueChange={value => handleInputChange(field, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            {options.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field}-${option}`}
                  checked={formData[field]?.includes(option) || false}
                  onCheckedChange={checked => {
                    const current = formData[field] || []
                    if (checked) {
                      handleInputChange(field, [...current, option])
                    } else {
                      handleInputChange(
                        field,
                        current.filter((item: string) => item !== option)
                      )
                    }
                  }}
                />
                <Label htmlFor={`${field}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      case 'file':
        return (
          <Input
            type="file"
            onChange={e => handleInputChange(field, e.target.files?.[0])}
          />
        )

      default:
        return (
          <Input
            placeholder={description}
            value={formData[field] || ''}
            onChange={e => handleInputChange(field, e.target.value)}
          />
        )
    }
  }

  const getExecutionStatus = () => {
    if (isExecuting) {
      return 'running'
    }
    if ((executionResult as any)?.data?.status === 'waiting_for_input') {
      return 'waiting_for_input'
    }
    if ((executionResult as any)?.data) {
      return 'completed'
    }
    if (executionError) {
      return 'failed'
    }
    return 'idle'
  }

  const getStatusIcon = () => {
    const status = getExecutionStatus()
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'waiting_for_input':
        return <UserCheck className="h-4 w-4 text-orange-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    const status = getExecutionStatus()
    switch (status) {
      case 'running':
        return `Executing workflow... ${elapsedTime}s`
      case 'waiting_for_input':
        return 'Workflow is waiting for your input'
      case 'completed':
        return 'Execution completed successfully!'
      case 'failed': {
        const errData = (executionError as any)?.data
        const errMsg = errData?.error || errData?.details || 'Unknown error'
        const extraInfo = errData?.receivedFields
          ? ` [fields: ${errData.receivedFields.join(', ')}]`
          : ''
        return `Execution failed: ${errMsg}${extraInfo}`
      }
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-primary" />
            <span>Execute: {workflow.name}</span>
          </DialogTitle>
          <DialogDescription>{workflow.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Execution Status */}
          {getExecutionStatus() !== 'idle' && (
            <Alert
              className={`border-l-4 ${
                getExecutionStatus() === 'completed'
                  ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                  : getExecutionStatus() === 'failed'
                    ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                    : getExecutionStatus() === 'waiting_for_input'
                      ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
                      : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
              }`}
            >
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <AlertDescription className="flex-1 font-medium">
                  {getStatusText()}
                </AlertDescription>
                {getExecutionStatus() === 'running' && (
                  <span className="text-xs text-muted-foreground">
                    Check{' '}
                    <button
                      className="text-blue-600 underline"
                      onClick={() => router.push('/engines/executions')}
                    >
                      history
                    </button>
                  </span>
                )}
              </div>
              {getExecutionStatus() === 'running' && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(95, elapsedTime * 3)}%` }}
                  />
                </div>
              )}
              {(executionResult as any)?.data && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium">Tokens:</span>{' '}
                      {(executionResult as any).data.apiKeyUsed?.tokensUsed ||
                        0}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span>{' '}
                      {(
                        ((executionResult as any).data.executionTimeMs || 0) /
                        1000
                      ).toFixed(1)}
                      s
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span> $
                      {(
                        (executionResult as any).data.apiKeyUsed?.cost || 0
                      ).toFixed(3)}
                    </div>
                  </div>
                  {(executionResult as any).data.outputData && (
                    <div>
                      <span className="font-medium">Result:</span>
                      <div className="mt-1">
                        <ExecutionOutput
                          data={(executionResult as any).data.outputData}
                          maxHeight="300px"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push('/engines/executions')}
                    >
                      View All Executions
                    </Button>
                  </div>
                </div>
              )}
              {getExecutionStatus() === 'waiting_for_input' &&
                (executionResult as any)?.data?.dynamicInput && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded border border-orange-200 bg-orange-100 p-3 dark:bg-orange-900/20">
                      <h4 className="mb-2 font-medium text-orange-800 dark:text-orange-200">
                        Input Required
                      </h4>
                      <p className="mb-3 text-sm text-orange-700 dark:text-orange-300">
                        Step{' '}
                        {(executionResult as any).data.dynamicInput.currentStep}
                        : The workflow is waiting for your input to continue.
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          asChild
                          className="bg-orange-600 text-white hover:bg-orange-700"
                        >
                          <a
                            href={`/engines/executions/${(executionResult as any).data._id}/input`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Provide Input
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              `/engines/executions/${(executionResult as any).data._id}`,
                              '_blank'
                            )
                          }
                        >
                          View Execution
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </Alert>
          )}

          {/* API Key Selection */}
          <ApiKeySelector
            workflowCost={workflow.estimatedCost}
            availableKeys={allApiKeys}
            selectedKeyId={selectedApiKey}
            onKeySelect={setSelectedApiKey}
            onAddNewKey={() => {
              onClose()
              router.push('/engines/api-keys')
            }}
          />

          <Separator />

          {/* Workflow Parameters */}
          <div className="space-y-4">
            {Object.keys(workflow.inputSchema || {}).length > 0 && (
              <h3 className="text-lg font-semibold">Workflow Parameters</h3>
            )}

            {Object.entries(workflow.inputSchema || {}).map(
              ([field, schema]) => (
                <div key={field} className="space-y-2">
                  <Label
                    htmlFor={field}
                    className="flex items-center space-x-2"
                  >
                    <span className="capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {schema.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </Label>
                  {renderInputField(field, schema)}
                  {schema.description && (
                    <p className="text-sm text-muted-foreground">
                      {schema.description}
                    </p>
                  )}
                </div>
              )
            )}
          </div>

          <Separator />

          {/* Email Results Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email-results"
              checked={emailResults}
              onCheckedChange={checked => setEmailResults(checked === true)}
            />
            <Label htmlFor="email-results" className="text-sm">
              Email results to me when execution completes
            </Label>
          </div>

          {/* Execution Summary */}
          <div className="space-y-3 rounded-lg bg-muted/30 p-4">
            <h4 className="font-medium">Execution Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Cost: ${getExecutionCost().toFixed(3)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Est. Time: {workflow.avgExecutionTime}s</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {getExecutionCost() === 0
                ? 'Execution is free using your API key'
                : 'You will be charged for this execution'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isExecuting}>
              Cancel
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isExecuting || !selectedApiKey || !workflowId}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
