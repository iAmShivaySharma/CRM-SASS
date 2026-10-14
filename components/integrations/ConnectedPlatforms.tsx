'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaFacebook, FaInstagram, FaGoogle, FaLinkedin } from 'react-icons/fa'
import { RefreshCw, Trash2, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetIntegrationsQuery,
  useConnectFacebookLeadAdsMutation,
  useConnectGoogleMutation,
  useConnectLinkedInMutation,
  useDeleteIntegrationMutation,
  useSyncGoogleMutation,
  useSyncLinkedInMutation,
  LeadFormIntegration,
} from '@/lib/api/leadFormApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

const PLATFORMS = [
  {
    id: 'facebook' as const,
    name: 'Facebook',
    description: 'Capture leads from Facebook Lead Ad forms',
    icon: FaFacebook,
    iconColor: 'text-[#1877F2]',
  },
  {
    id: 'instagram' as const,
    name: 'Instagram',
    description: 'Capture leads from Instagram Lead Ad forms',
    icon: FaInstagram,
    iconColor: 'text-[#E4405F]',
  },
  {
    id: 'google_ads' as const,
    name: 'Google Ads',
    description: 'Capture leads from Google Ads lead form extensions',
    icon: FaGoogle,
    iconColor: 'text-[#4285F4]',
  },
  {
    id: 'linkedin' as const,
    name: 'LinkedIn',
    description: 'Capture leads from LinkedIn Lead Gen Forms',
    icon: FaLinkedin,
    iconColor: 'text-[#0A66C2]',
  },
]

export function ConnectedPlatforms() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const { data, isLoading } = useGetIntegrationsQuery(workspaceId, {
    skip: !workspaceId,
  })
  const [connectFacebook] = useConnectFacebookLeadAdsMutation()
  const [connectGoogle] = useConnectGoogleMutation()
  const [connectLinkedIn] = useConnectLinkedInMutation()
  const [deleteIntegration] = useDeleteIntegrationMutation()
  const [syncGoogle, { isLoading: isSyncingGoogle }] = useSyncGoogleMutation()
  const [syncLinkedIn, { isLoading: isSyncingLinkedIn }] = useSyncLinkedInMutation()
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  const integrations = data?.integrations || []

  const getIntegrationForPlatform = (platformId: string) =>
    integrations.find(i => i.platform === platformId && i.isActive)

  const getRedirectUri = () =>
    `${window.location.origin}/webhooks/callback`

  const handleConnect = useCallback(async (platformId: string) => {
    if (!workspaceId) return
    setConnectingPlatform(platformId)

    try {
      const redirectUri = getRedirectUri()
      const oauthPlatform = platformId === 'instagram' ? 'facebook' : platformId
      const response = await fetch(
        `/api/social/lead-forms/oauth-url?platform=${oauthPlatform}&workspaceId=${workspaceId}&redirectUri=${encodeURIComponent(redirectUri)}`,
        { credentials: 'include' }
      )
      const result = await response.json()

      if (!result.success || !result.url) {
        toast.error('Failed to get OAuth URL')
        setConnectingPlatform(null)
        return
      }

      const popup = window.open(
        result.url,
        `connect_${platformId}`,
        'width=600,height=700,scrollbars=yes'
      )

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'oauth_callback') return

        window.removeEventListener('message', handleMessage)
        popup?.close()

        const { code, token, platform } = event.data

        try {
          if (platformId === 'facebook' || platformId === 'instagram') {
            if (!token) {
              toast.error('No access token received')
              return
            }
            await connectFacebook({
              workspaceId,
              accessToken: token,
              pageId: '',
              pageName: '',
            }).unwrap()
          } else if (platformId === 'google_ads') {
            if (!code) {
              toast.error('No authorization code received')
              return
            }
            await connectGoogle({
              workspaceId,
              code,
              redirectUri: getRedirectUri(),
            }).unwrap()
          } else if (platformId === 'linkedin') {
            if (!code) {
              toast.error('No authorization code received')
              return
            }
            await connectLinkedIn({
              workspaceId,
              code,
              redirectUri: getRedirectUri(),
            }).unwrap()
          }
          toast.success(`${PLATFORMS.find(p => p.id === platformId)?.name} connected successfully`)
        } catch {
          toast.error('Failed to connect platform')
        } finally {
          setConnectingPlatform(null)
        }
      }

      window.addEventListener('message', handleMessage)

      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopupClosed)
          setConnectingPlatform(null)
          window.removeEventListener('message', handleMessage)
        }
      }, 1000)
    } catch {
      toast.error('Failed to initiate connection')
      setConnectingPlatform(null)
    }
  }, [workspaceId, connectFacebook, connectGoogle, connectLinkedIn])

  const handleDisconnect = async (integrationId: string) => {
    try {
      await deleteIntegration(integrationId).unwrap()
      toast.success('Platform disconnected')
    } catch {
      toast.error('Failed to disconnect platform')
    }
  }

  const handleSync = async (integration: LeadFormIntegration) => {
    try {
      if (integration.platform === 'google_ads') {
        const result = await syncGoogle({
          workspaceId,
          integrationId: integration.id,
        }).unwrap()
        toast.success(`Synced ${result.synced} leads from Google Ads`)
      } else if (integration.platform === 'linkedin') {
        const result = await syncLinkedIn({
          workspaceId,
          integrationId: integration.id,
        }).unwrap()
        toast.success(`Synced ${result.synced} leads from LinkedIn`)
      }
    } catch {
      toast.error('Failed to sync leads')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-32 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-48 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map(platform => {
          const integration = getIntegrationForPlatform(platform.id)
          const isConnecting = connectingPlatform === platform.id
          const Icon = platform.icon

          return (
            <Card key={platform.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${platform.iconColor}`} />
                  <CardTitle className="text-base">{platform.name}</CardTitle>
                </div>
                {integration ? (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{platform.description}</p>

                {integration && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3">
                    {integration.accountName && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Account</span>
                        <span className="font-medium text-foreground">{integration.accountName}</span>
                      </div>
                    )}
                    {integration.pageName && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Page</span>
                        <span className="font-medium text-foreground">{integration.pageName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Sync</span>
                      <span className="font-medium text-foreground">
                        {formatDate(integration.lastSyncAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Webhook</span>
                      {integration.webhookSubscribed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {integration ? (
                    <>
                      {(platform.id === 'google_ads' || platform.id === 'linkedin') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration)}
                          disabled={isSyncingGoogle || isSyncingLinkedIn}
                        >
                          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${(isSyncingGoogle || isSyncingLinkedIn) ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Disconnect
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect {platform.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the connection to {platform.name} and stop receiving new
                              leads from this platform. Existing leads will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDisconnect(integration.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
