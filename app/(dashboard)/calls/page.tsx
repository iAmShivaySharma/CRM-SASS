'use client'

import { useState, useMemo } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetCallSettingsQuery,
  useSaveCallSettingsMutation,
  useInitiateCallMutation,
  useGetCallLogsQuery,
} from '@/lib/api/callsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Phone,
  PhoneCall,
  PhoneOff,
  Save,
  TestTube,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function CallsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id ?? ''

  const { data: settingsData, isLoading: settingsLoading } =
    useGetCallSettingsQuery({ workspaceId }, { skip: !currentWorkspace })

  const { data: logsData, isLoading: logsLoading } = useGetCallLogsQuery(
    { workspaceId },
    { skip: !currentWorkspace }
  )

  const [saveSettings, { isLoading: saving }] = useSaveCallSettingsMutation()
  const [initiateCall, { isLoading: calling }] = useInitiateCallMutation()

  const [dialNumber, setDialNumber] = useState('')
  const [activeCalling, setActiveCalling] = useState(false)

  const [logStatusFilter, setLogStatusFilter] = useState<string>('all')
  const [logSearch, setLogSearch] = useState('')

  const [settingsForm, setSettingsForm] = useState({
    provider: 'telecmi',
    apiKey: '',
    apiSecret: '',
    callerId: '',
    webhookUrl: '',
  })

  const existingSettings = settingsData?.settings
  const settingsInitialized = useState(false)

  if (existingSettings && !settingsInitialized[0]) {
    setSettingsForm({
      provider: existingSettings.provider,
      apiKey: existingSettings.apiKey,
      apiSecret: existingSettings.apiSecret,
      callerId: existingSettings.callerId,
      webhookUrl: existingSettings.webhookUrl || '',
    })
    settingsInitialized[1](true)
  }

  const logs = logsData?.logs ?? []

  const filteredLogs = useMemo(() => {
    let filtered = logs
    if (logStatusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === logStatusFilter)
    }
    if (logSearch.trim()) {
      filtered = filtered.filter(
        l =>
          l.recipient.includes(logSearch.trim()) ||
          l.caller.includes(logSearch.trim())
      )
    }
    return filtered
  }, [logs, logStatusFilter, logSearch])

  const recentCalls = logs.slice(0, 10)

  const handleDial = async () => {
    if (!dialNumber.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    if (activeCalling) {
      setActiveCalling(false)
      toast.info('Call ended')
      return
    }

    try {
      const result = await initiateCall({
        workspaceId,
        to: dialNumber.startsWith('+') ? dialNumber : `+91${dialNumber}`,
      }).unwrap()

      if (result.success) {
        setActiveCalling(true)
        toast.success(`Calling ${dialNumber}...`)
      } else {
        toast.error(result.message || 'Failed to initiate call')
      }
    } catch {
      toast.error('Failed to initiate call')
    }
  }

  const handleSaveSettings = async () => {
    if (
      !settingsForm.apiKey.trim() ||
      !settingsForm.apiSecret.trim() ||
      !settingsForm.callerId.trim()
    ) {
      toast.error('API Key, API Secret, and Caller ID are required')
      return
    }

    try {
      await saveSettings({
        workspaceId,
        provider: settingsForm.provider as 'telecmi' | 'exotel' | 'custom',
        apiKey: settingsForm.apiKey,
        apiSecret: settingsForm.apiSecret,
        callerId: settingsForm.callerId,
        webhookUrl: settingsForm.webhookUrl || undefined,
      }).unwrap()
      toast.success('Call settings saved')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const handleTestCall = async () => {
    if (!settingsForm.callerId.trim()) {
      toast.error('Configure caller ID first')
      return
    }
    try {
      await initiateCall({
        workspaceId,
        to: settingsForm.callerId,
      }).unwrap()
      toast.success('Test call initiated')
    } catch {
      toast.error('Test call failed - check your settings')
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <div className="mb-6 flex items-center gap-3">
        <Phone className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Calls</h1>
      </div>

      <Tabs
        defaultValue="dialer"
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
          <TabsTrigger value="logs">Call Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dialer" className="mt-4 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-md space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  Make a Call
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                      +91
                    </div>
                    <Input
                      placeholder="9876543210"
                      value={dialNumber}
                      onChange={e => setDialNumber(e.target.value)}
                      className="flex-1 text-lg"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleDial()
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleDial}
                  disabled={calling}
                  className="w-full"
                  variant={activeCalling ? 'destructive' : 'default'}
                  size="lg"
                >
                  {calling ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : activeCalling ? (
                    <PhoneOff className="mr-2 h-5 w-5" />
                  ) : (
                    <Phone className="mr-2 h-5 w-5" />
                  )}
                  {activeCalling ? 'Hang Up' : 'Call'}
                </Button>
              </CardContent>
            </Card>

            {recentCalls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentCalls.map(call => (
                      <button
                        key={call._id}
                        className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-left transition-colors hover:bg-muted/80"
                        onClick={() => setDialNumber(call.recipient)}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {call.recipient}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(call.duration)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            call.status === 'completed'
                              ? 'default'
                              : call.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {call.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {['all', 'completed', 'missed', 'failed'].map(status => (
                  <Button
                    key={status}
                    variant={logStatusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by number..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {logsLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-muted-foreground">No call logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map(call => (
                  <Card key={call._id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{call.caller}</p>
                          <span className="text-muted-foreground">&rarr;</span>
                          <p className="text-sm font-medium">
                            {call.recipient}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(call.duration)} &middot;{' '}
                          {call.direction}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <Badge
                          variant={
                            call.status === 'completed'
                              ? 'default'
                              : call.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {call.status}
                        </Badge>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(call.createdAt).toLocaleDateString()}{' '}
                          {new Date(call.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Call Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select
                        value={settingsForm.provider}
                        onValueChange={v =>
                          setSettingsForm(f => ({ ...f, provider: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="telecmi">TeleCMI</SelectItem>
                          <SelectItem value="exotel">Exotel</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={settingsForm.apiKey}
                        onChange={e =>
                          setSettingsForm(f => ({
                            ...f,
                            apiKey: e.target.value,
                          }))
                        }
                        placeholder="Enter API key"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>API Secret</Label>
                      <Input
                        type="password"
                        value={settingsForm.apiSecret}
                        onChange={e =>
                          setSettingsForm(f => ({
                            ...f,
                            apiSecret: e.target.value,
                          }))
                        }
                        placeholder="Enter API secret"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Caller ID</Label>
                      <Input
                        value={settingsForm.callerId}
                        onChange={e =>
                          setSettingsForm(f => ({
                            ...f,
                            callerId: e.target.value,
                          }))
                        }
                        placeholder="e.g. +919876543210"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Webhook URL (optional)</Label>
                      <Input
                        value={settingsForm.webhookUrl}
                        onChange={e =>
                          setSettingsForm(f => ({
                            ...f,
                            webhookUrl: e.target.value,
                          }))
                        }
                        placeholder="https://your-domain.com/api/calls/webhook"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={handleTestCall}>
                        <TestTube className="mr-2 h-4 w-4" />
                        Test Call
                      </Button>
                      <Button onClick={handleSaveSettings} disabled={saving}>
                        {saving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
