'use client'

import { useState } from 'react'
import {
  Plus,
  ExternalLink,
  Key,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  useAddApiKeyMutation,
  useValidateApiKeyMutation,
} from '@/lib/api/enginesApi'

interface AddApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddApiKeyModal({ isOpen, onClose }: AddApiKeyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    setAsDefault: false,
  })
  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'valid' | 'invalid'
  >('idle')

  const [validateApiKey, { isLoading: isValidating }] =
    useValidateApiKeyMutation()
  const [addApiKey, { isLoading: isSubmitting, error: submitError }] =
    useAddApiKeyMutation()

  const handleApiKeyChange = (value: string) => {
    setFormData(prev => ({ ...prev, apiKey: value }))
    setValidationStatus('idle')
  }

  const handleValidate = async () => {
    if (!formData.apiKey.trim()) return

    try {
      const result = await validateApiKey({
        apiKey: formData.apiKey,
        provider: 'openrouter',
      }).unwrap()
      setValidationStatus(result.valid ? 'valid' : 'invalid')
    } catch {
      setValidationStatus('invalid')
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) return

    try {
      await addApiKey({
        keyName: formData.name,
        apiKey: formData.apiKey,
        setAsDefault: formData.setAsDefault,
      }).unwrap()

      setFormData({ name: '', apiKey: '', setAsDefault: false })
      setValidationStatus('idle')
      onClose()
    } catch {
      // Error state handled via RTK Query
    }
  }

  const handleClose = () => {
    setFormData({ name: '', apiKey: '', setAsDefault: false })
    setValidationStatus('idle')
    onClose()
  }

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    }
    if (validationStatus === 'valid') {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    if (validationStatus === 'invalid') {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const getValidationMessage = () => {
    if (isValidating) return 'Validating API key...'
    if (validationStatus === 'valid') {
      return 'API key is valid and ready to use!'
    }
    if (validationStatus === 'invalid') {
      return 'Invalid API key. Please check your key and try again.'
    }
    return ''
  }

  const isFormValid =
    formData.name.trim() &&
    formData.apiKey.trim() &&
    validationStatus === 'valid'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Add OpenRouter API Key</span>
          </DialogTitle>
          <DialogDescription>
            Add your OpenRouter API key to execute workflows for free. Your key
            will be encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>New to OpenRouter?</strong> Get your API key from{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary hover:underline"
              >
                OpenRouter Dashboard
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>{' '}
              and add credits to your account.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., My Primary OpenRouter Key"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
              />
              <p className="text-sm text-muted-foreground">
                Give your API key a memorable name for easy identification.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">OpenRouter API Key</Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={formData.apiKey}
                    onChange={e => handleApiKeyChange(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleValidate}
                    disabled={!formData.apiKey.trim() || isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>

                {(isValidating || validationStatus !== 'idle') && (
                  <div className="flex items-center space-x-2 text-sm">
                    {getValidationIcon()}
                    <span
                      className={
                        validationStatus === 'valid'
                          ? 'text-green-600'
                          : validationStatus === 'invalid'
                            ? 'text-red-600'
                            : 'text-blue-600'
                      }
                    >
                      {getValidationMessage()}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Your API key should start with &quot;sk-or-v1-&quot;. We&apos;ll
                validate it with OpenRouter.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="set-default"
                checked={formData.setAsDefault}
                onCheckedChange={checked =>
                  setFormData(prev => ({
                    ...prev,
                    setAsDefault: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="set-default" className="text-sm">
                Set as default API key for new executions
              </Label>
            </div>
          </div>

          {submitError && (
            <Alert className="border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {(submitError as any)?.data?.error ||
                  'Failed to add API key. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 rounded-lg bg-muted/30 p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Security & Privacy</h4>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Your API key is encrypted using AES-256 encryption</li>
              <li>We never log or store your actual API key in plain text</li>
              <li>Keys are only decrypted when executing workflows</li>
              <li>You can delete your keys at any time</li>
            </ul>
          </div>

          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
            <h4 className="mb-2 font-medium text-green-800 dark:text-green-300">
              Benefits of Using Your Own API Key
            </h4>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-400">
              <li>Execute workflows completely free</li>
              <li>No per-execution charges</li>
              <li>Full control over your usage and costs</li>
              <li>Access to all available models on OpenRouter</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Key...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Add API Key
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
