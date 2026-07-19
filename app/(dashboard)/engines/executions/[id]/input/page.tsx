'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Timer,
  FileText,
} from 'lucide-react'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  useGetExecutionInputQuery,
  useSubmitExecutionInputMutation,
} from '@/lib/api/enginesApi'

function useCountdown(targetDate: string | undefined) {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    if (!targetDate) return

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      setRemaining(Math.max(0, diff))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  return { remaining, minutes, seconds, isExpired: remaining <= 0 }
}

function formatCountdown(minutes: number, seconds: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m ${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}

interface FieldError {
  [fieldName: string]: string
}

export default function ExecutionInputPage() {
  const params = useParams()
  const router = useRouter()
  const executionId = params.id as string

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitted, setSubmitted] = useState(false)

  const {
    data: inputResponse,
    isLoading,
    error: fetchError,
    refetch,
  } = useGetExecutionInputQuery(executionId, {
    pollingInterval: submitted ? 0 : 15000,
  })

  const [
    submitInput,
    { isLoading: isSubmitting, data: submitResult, error: submitError },
  ] = useSubmitExecutionInputMutation()

  const inputData = inputResponse?.data
  const inputSchema = inputData?.inputRequirement?.inputSchema
  const countdown = useCountdown(inputData?.inputRequirement?.timeoutAt)

  const urgencyLevel = useMemo(() => {
    if (countdown.isExpired) return 'expired'
    if (countdown.minutes < 5) return 'critical'
    if (countdown.minutes < 15) return 'urgent'
    return 'normal'
  }, [countdown.isExpired, countdown.minutes])

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const validateForm = useCallback((): boolean => {
    if (!inputSchema) return false

    const errors: FieldError = {}

    for (const [fieldName, fieldConfig] of Object.entries(inputSchema)) {
      const config = fieldConfig as any
      const value = formData[fieldName]

      if (
        config.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors[fieldName] = `${fieldName} is required`
        continue
      }

      if (value === undefined || value === null || value === '') continue

      if (config.type === 'string' && typeof value === 'string') {
        if (config.minLength && value.length < config.minLength) {
          errors[fieldName] = `Must be at least ${config.minLength} characters`
        }
        if (config.maxLength && value.length > config.maxLength) {
          errors[fieldName] = `Must be at most ${config.maxLength} characters`
        }
      }

      if (config.type === 'number') {
        const num = Number(value)
        if (isNaN(num)) {
          errors[fieldName] = 'Must be a valid number'
        } else {
          if (config.min !== undefined && num < config.min) {
            errors[fieldName] = `Must be at least ${config.min}`
          }
          if (config.max !== undefined && num > config.max) {
            errors[fieldName] = `Must be at most ${config.max}`
          }
        }
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [inputSchema, formData])

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      await submitInput({
        executionId,
        inputData: formData,
      }).unwrap()
      setSubmitted(true)
    } catch {
      // Error state handled via RTK Query
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading input requirement...</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    const status = (fetchError as any)?.status
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            {status === 404
              ? 'Execution not found. It may have been completed or removed.'
              : status === 410
                ? 'This input request has expired.'
                : 'Failed to load input requirement. Please try again.'}
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/engines/executions')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Executions
          </Button>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!inputData?.isWaitingForInput) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="mb-4 h-12 w-12 text-green-600" />
            <h2 className="mb-2 text-xl font-semibold">No Input Required</h2>
            <p className="mb-6 text-center text-muted-foreground">
              {inputData?.message || 'This execution is not waiting for input.'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/engines/executions')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Executions
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted && submitResult?.success) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="mb-4 h-12 w-12 text-green-600" />
            <h2 className="mb-2 text-xl font-semibold">Input Submitted</h2>
            <p className="mb-2 text-center text-muted-foreground">
              Your input has been received and the workflow is resuming.
            </p>
            {submitResult.data.workflowStatus.isWaitingForMoreInput && (
              <Badge variant="secondary" className="mb-4">
                Workflow may require additional input
              </Badge>
            )}
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/engines/executions')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Executions
              </Button>
              {submitResult.data.workflowStatus.isWaitingForMoreInput && (
                <Button
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({})
                    refetch()
                  }}
                >
                  Provide Next Input
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { inputRequirement } = inputData

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2"
            onClick={() => router.push('/engines/executions')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Provide Workflow Input
          </h1>
          <p className="text-muted-foreground">
            {inputData.execution.workflowName} — Step {inputRequirement?.step}
          </p>
        </div>
      </div>

      {/* Timeout Countdown */}
      {inputRequirement && (
        <Card
          className={
            urgencyLevel === 'expired'
              ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
              : urgencyLevel === 'critical'
                ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10'
                : urgencyLevel === 'urgent'
                  ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'
                  : 'border-border'
          }
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Timer
                className={`h-5 w-5 ${
                  urgencyLevel === 'expired' || urgencyLevel === 'critical'
                    ? 'text-red-600'
                    : urgencyLevel === 'urgent'
                      ? 'text-orange-600'
                      : 'text-muted-foreground'
                }`}
              />
              <div>
                <p className="text-sm font-medium">
                  {countdown.isExpired
                    ? 'Input request has expired'
                    : 'Time remaining'}
                </p>
                {!countdown.isExpired && (
                  <p className="text-xs text-muted-foreground">
                    Expires at{' '}
                    {new Date(inputRequirement.timeoutAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {!countdown.isExpired && (
              <div
                className={`text-2xl font-bold tabular-nums ${
                  urgencyLevel === 'critical'
                    ? 'text-red-600'
                    : urgencyLevel === 'urgent'
                      ? 'text-orange-600'
                      : 'text-foreground'
                }`}
              >
                {formatCountdown(countdown.minutes, countdown.seconds)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {countdown.isExpired && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            This input request has expired. The workflow may have been cancelled
            or timed out.
          </AlertDescription>
        </Alert>
      )}

      {/* Step Description */}
      {inputData.userInput?.metadata?.stepDescription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Step Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {inputData.userInput.metadata.stepDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Input Form */}
      {inputSchema && !countdown.isExpired && (
        <Card>
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
            <CardDescription>
              Fill in the required fields to continue the workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(inputSchema).map(([fieldName, fieldConfig]) => {
              const config = fieldConfig as any
              return (
                <InputField
                  key={fieldName}
                  name={fieldName}
                  config={config}
                  value={formData[fieldName]}
                  error={fieldErrors[fieldName]}
                  onChange={value => handleFieldChange(fieldName, value)}
                />
              )
            })}

            {submitError && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300">
                  {(submitError as any)?.data?.error ||
                    'Failed to submit input. Please try again.'}
                  {(submitError as any)?.data?.details && (
                    <ul className="mt-2 list-disc pl-4 text-sm">
                      {((submitError as any).data.details as string[]).map(
                        (detail, i) => (
                          <li key={i}>{detail}</li>
                        )
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/engines/executions')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || countdown.isExpired}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Input
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface InputFieldProps {
  name: string
  config: {
    type: string
    required?: boolean
    description?: string
    options?: string[]
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    enum?: string[]
  }
  value: any
  error?: string
  onChange: (value: any) => void
}

function InputField({ name, config, value, error, onChange }: InputFieldProps) {
  const label = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()

  const isTextarea =
    config.type === 'string' &&
    (name.toLowerCase().includes('message') ||
      name.toLowerCase().includes('content') ||
      name.toLowerCase().includes('description') ||
      name.toLowerCase().includes('body') ||
      (config.maxLength && config.maxLength > 500))

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center gap-2">
        <span>{label}</span>
        {config.required && (
          <Badge variant="destructive" className="px-1.5 py-0 text-xs">
            Required
          </Badge>
        )}
      </Label>

      {config.type === 'string' &&
        !config.enum &&
        !config.options &&
        (isTextarea ? (
          <Textarea
            id={name}
            placeholder={config.description || `Enter ${label.toLowerCase()}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            rows={4}
            maxLength={config.maxLength}
            className={error ? 'border-red-500' : ''}
          />
        ) : (
          <Input
            id={name}
            placeholder={config.description || `Enter ${label.toLowerCase()}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            maxLength={config.maxLength}
            className={error ? 'border-red-500' : ''}
          />
        ))}

      {config.type === 'number' && (
        <Input
          id={name}
          type="number"
          placeholder={config.description || `Enter ${label.toLowerCase()}`}
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
          min={config.min}
          max={config.max}
          className={error ? 'border-red-500' : ''}
        />
      )}

      {config.type === 'boolean' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={name}
            checked={value || false}
            onCheckedChange={checked => onChange(checked)}
          />
          <Label htmlFor={name} className="text-sm font-normal">
            {config.description || label}
          </Label>
        </div>
      )}

      {(config.type === 'select' ||
        config.enum ||
        (config.type === 'string' && config.options)) && (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {(config.enum || config.options || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {config.type === 'array' && config.options && (
        <div className="space-y-2 rounded-lg border p-3">
          {config.options.map((option: string) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${name}-${option}`}
                checked={(value || []).includes(option)}
                onCheckedChange={checked => {
                  const current = value || []
                  if (checked) {
                    onChange([...current, option])
                  } else {
                    onChange(current.filter((item: string) => item !== option))
                  }
                }}
              />
              <Label
                htmlFor={`${name}-${option}`}
                className="text-sm font-normal"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      )}

      {config.type === 'file' && (
        <Input
          id={name}
          type="file"
          onChange={e => onChange(e.target.files?.[0])}
          className={error ? 'border-red-500' : ''}
        />
      )}

      {config.description && config.type !== 'boolean' && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
