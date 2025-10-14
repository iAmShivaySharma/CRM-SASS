'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Shield, Server, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface EmailAccountSetupProps {
  isOpen: boolean
  onClose: () => void
  onAccountAdded: (accountId: string) => void
}

export function EmailAccountSetup({ isOpen, onClose, onAccountAdded }: EmailAccountSetupProps) {
  const [activeTab, setActiveTab] = useState('oauth')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    emailAddress: '',
    provider: 'gmail',

    // SMTP/IMAP Config
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUsername: '',
    smtpPassword: '',

    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    imapUsername: '',
    imapPassword: '',

    // Settings
    syncEnabled: true,
    syncInterval: 15,
    signature: ''
  })

  const handleOAuthConnect = async (provider: 'gmail' | 'outlook') => {
    setIsLoading(true)

    try {
      // Generate OAuth state
      const response = await fetch('/api/email/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth')
      }

      const { authUrl } = await response.json()

      // Open OAuth window
      const popup = window.open(
        authUrl,
        'oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'OAUTH_SUCCESS') {
          popup?.close()
          window.removeEventListener('message', handleMessage)
          onAccountAdded(event.data.accountId)
          toast.success('Email account connected successfully!')
        } else if (event.data.type === 'OAUTH_ERROR') {
          popup?.close()
          window.removeEventListener('message', handleMessage)
          toast.error('Failed to connect email account')
          setIsLoading(false)
        }
      }

      window.addEventListener('message', handleMessage)

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setIsLoading(false)
        }
      }, 1000)

    } catch (error) {
      toast.error('Failed to start OAuth process')
      setIsLoading(false)
    }
  }

  const handleManualSetup = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/email/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeTab === 'smtp' ? 'smtp' : 'imap',
          displayName: formData.displayName,
          emailAddress: formData.emailAddress,
          smtpConfig: activeTab === 'smtp' ? {
            host: formData.smtpHost,
            port: formData.smtpPort,
            secure: formData.smtpSecure,
            username: formData.smtpUsername,
            password: formData.smtpPassword
          } : undefined,
          imapConfig: activeTab === 'imap' ? {
            host: formData.imapHost,
            port: formData.imapPort,
            secure: formData.imapSecure,
            username: formData.imapUsername,
            password: formData.imapPassword
          } : undefined,
          settings: {
            syncEnabled: formData.syncEnabled,
            syncInterval: formData.syncInterval,
            signature: formData.signature
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create email account')
      }

      const { accountId } = await response.json()
      onAccountAdded(accountId)
      toast.success('Email account added successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add email account')
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeTab === 'smtp' ? 'smtp' : 'imap',
          config: activeTab === 'smtp' ? {
            host: formData.smtpHost,
            port: formData.smtpPort,
            secure: formData.smtpSecure,
            username: formData.smtpUsername,
            password: formData.smtpPassword
          } : {
            host: formData.imapHost,
            port: formData.imapPort,
            secure: formData.imapSecure,
            username: formData.imapUsername,
            password: formData.imapPassword
          }
        })
      })

      if (!response.ok) {
        throw new Error('Connection test failed')
      }

      toast.success('Connection test successful!')
    } catch (error) {
      toast.error('Connection test failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Add Email Account
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="oauth" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              OAuth
            </TabsTrigger>
            <TabsTrigger value="smtp" className="flex items-center">
              <Server className="h-4 w-4 mr-2" />
              SMTP
            </TabsTrigger>
            <TabsTrigger value="imap" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              IMAP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="oauth" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                OAuth provides secure authentication without storing your password. Recommended for Gmail and Outlook.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOAuthConnect('gmail')}>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle>Gmail</CardTitle>
                  <CardDescription>
                    Connect your Google/Gmail account
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOAuthConnect('outlook')}>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Outlook</CardTitle>
                  <CardDescription>
                    Connect your Microsoft/Outlook account
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4">
            <Alert>
              <Server className="h-4 w-4" />
              <AlertDescription>
                SMTP configuration for sending emails. Use this for custom email servers or providers not supporting OAuth.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email Address</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData(prev => ({ ...prev, smtpHost: e.target.value }))}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Security</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.smtpSecure}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, smtpSecure: checked }))}
                  />
                  <span className="text-sm">SSL/TLS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUsername">Username</Label>
                <Input
                  id="smtpUsername"
                  value={formData.smtpUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, smtpUsername: e.target.value }))}
                  placeholder="username or email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">Password</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, smtpPassword: e.target.value }))}
                  placeholder="password or app password"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
              <Button
                onClick={handleManualSetup}
                disabled={isLoading || !formData.smtpHost || !formData.smtpUsername}
                className="flex-1"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Account
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="imap" className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                IMAP configuration for receiving emails. Required for email synchronization.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName2">Display Name</Label>
                <Input
                  id="displayName2"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailAddress2">Email Address</Label>
                <Input
                  id="emailAddress2"
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imapHost">IMAP Host</Label>
                <Input
                  id="imapHost"
                  value={formData.imapHost}
                  onChange={(e) => setFormData(prev => ({ ...prev, imapHost: e.target.value }))}
                  placeholder="imap.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imapPort">Port</Label>
                <Input
                  id="imapPort"
                  type="number"
                  value={formData.imapPort}
                  onChange={(e) => setFormData(prev => ({ ...prev, imapPort: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Security</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.imapSecure}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, imapSecure: checked }))}
                  />
                  <span className="text-sm">SSL/TLS</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imapUsername">Username</Label>
                <Input
                  id="imapUsername"
                  value={formData.imapUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, imapUsername: e.target.value }))}
                  placeholder="username or email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imapPassword">Password</Label>
                <Input
                  id="imapPassword"
                  type="password"
                  value={formData.imapPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, imapPassword: e.target.value }))}
                  placeholder="password or app password"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Synchronization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync emails from this account
                  </p>
                </div>
                <Switch
                  checked={formData.syncEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, syncEnabled: checked }))}
                />
              </div>

              {formData.syncEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                  <Select
                    value={formData.syncInterval.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, syncInterval: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
              <Button
                onClick={handleManualSetup}
                disabled={isLoading || !formData.imapHost || !formData.imapUsername}
                className="flex-1"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Account
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}