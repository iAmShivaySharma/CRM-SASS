'use client'

import { useState } from 'react'
import { Plus, ExternalLink, Key, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

interface AddApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddApiKeyModal({ isOpen, onClose }: AddApiKeyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    setAsDefault: false
  })
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApiKeyChange = (value: string) => {
    setFormData(prev => ({ ...prev, apiKey: value }))
    setValidationStatus('idle')
  }

  const validateApiKey = async () => {
    if (!formData.apiKey.trim()) return

    setIsValidating(true)

    // Simulate API key validation
    setTimeout(() => {
      // Check if it looks like a valid OpenRouter key
      const isValid = formData.apiKey.startsWith('sk-or-v1-') && formData.apiKey.length > 20
      setValidationStatus(isValid ? 'valid' : 'invalid')
      setIsValidating(false)
    }, 2000)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) return

    setIsSubmitting(true)

    // Simulate saving the API key
    setTimeout(() => {
      setIsSubmitting(false)
      onClose()
      // Reset form
      setFormData({ name: '', apiKey: '', setAsDefault: false })
      setValidationStatus('idle')
    }, 2000)
  }

  const getValidationIcon = () => {
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    if (validationStatus === 'valid') return <CheckCircle className="h-4 w-4 text-green-600" />
    if (validationStatus === 'invalid') return <AlertCircle className="h-4 w-4 text-red-600" />
    return null
  }

  const getValidationMessage = () => {
    if (isValidating) return 'Validating API key...'
    if (validationStatus === 'valid') return 'API key is valid and ready to use!'
    if (validationStatus === 'invalid') return 'Invalid API key. Please check your key and try again.'
    return ''
  }

  const isFormValid = formData.name.trim() && formData.apiKey.trim() && validationStatus === 'valid'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Add OpenRouter API Key</span>
          </DialogTitle>
          <DialogDescription>
            Add your OpenRouter API key to execute workflows for free. Your key will be encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Getting Started Guide */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>New to OpenRouter?</strong> Get your API key from{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                OpenRouter Dashboard
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              {' '}and add credits to your account.
            </AlertDescription>
          </Alert>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., My Primary OpenRouter Key"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={validateApiKey}
                    disabled={!formData.apiKey.trim() || isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>

                {/* Validation Status */}
                {(isValidating || validationStatus !== 'idle') && (
                  <div className="flex items-center space-x-2 text-sm">
                    {getValidationIcon()}
                    <span className={
                      validationStatus === 'valid' ? 'text-green-600' :
                      validationStatus === 'invalid' ? 'text-red-600' :
                      'text-blue-600'
                    }>
                      {getValidationMessage()}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Your API key should start with "sk-or-v1-". We'll validate it with OpenRouter.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="set-default"
                checked={formData.setAsDefault}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, setAsDefault: checked as boolean }))
                }
              />
              <Label htmlFor="set-default" className="text-sm">
                Set as default API key for new executions
              </Label>
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Security & Privacy</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your API key is encrypted using AES-256 encryption</li>
              <li>• We never log or store your actual API key in plain text</li>
              <li>• Keys are only decrypted when executing workflows</li>
              <li>• You can delete your keys at any time</li>
            </ul>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
              Benefits of Using Your Own API Key
            </h4>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
              <li>• Execute workflows completely free</li>
              <li>• No per-execution charges</li>
              <li>• Full control over your usage and costs</li>
              <li>• Access to all available models on OpenRouter</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
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