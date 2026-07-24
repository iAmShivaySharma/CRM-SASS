'use client'

import { useState } from 'react'
import { Loader2, Shield, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function TwoFactorCard() {
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'disable'>(
    'idle'
  )
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)

  const handleSetup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        if (data.message === '2FA is already enabled') {
          setIs2FAEnabled(true)
          toast.info('2FA is already enabled')
          return
        }
        toast.error(data.message || 'Failed to setup 2FA')
        return
      }
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setStep('setup')
    } catch {
      toast.error('Failed to setup 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      toast.error('Enter a 6-digit code')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Invalid code')
        return
      }
      toast.success('2FA enabled successfully!')
      setIs2FAEnabled(true)
      setStep('idle')
      setToken('')
      setQrCode('')
      setSecret('')
    } catch {
      toast.error('Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      toast.error('Enter a 6-digit code to disable 2FA')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Invalid code')
        return
      }
      toast.success('2FA disabled')
      setIs2FAEnabled(false)
      setStep('idle')
      setToken('')
    } catch {
      toast.error('Failed to disable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {is2FAEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {is2FAEnabled
            ? '2FA is enabled. Your account has an extra layer of security.'
            : 'Add an extra layer of security using an authenticator app.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'idle' && !is2FAEnabled && (
          <Button onClick={handleSetup} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            Enable 2FA
          </Button>
        )}

        {step === 'idle' && is2FAEnabled && (
          <div className="space-y-3">
            <p className="text-sm text-green-600 dark:text-green-400">
              Two-factor authentication is active.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setStep('disable')}
            >
              Disable 2FA
            </Button>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm">
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, etc.):
            </p>
            {qrCode && (
              <div className="flex justify-center rounded-lg bg-white p-4">
                <img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Or enter this code manually:
              </p>
              <code className="block rounded bg-muted p-2 text-xs">
                {secret}
              </code>
            </div>
            <div className="space-y-2">
              <Label>Enter the 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  value={token}
                  onChange={e =>
                    setToken(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  maxLength={6}
                  className="w-32 text-center text-lg tracking-widest"
                />
                <Button onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Verify & Enable
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('idle')
                setToken('')
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-3">
            <p className="text-sm">
              Enter a code from your authenticator app to disable 2FA:
            </p>
            <div className="flex gap-2">
              <Input
                value={token}
                onChange={e =>
                  setToken(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="w-32 text-center text-lg tracking-widest"
              />
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Disable 2FA
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('idle')
                setToken('')
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
