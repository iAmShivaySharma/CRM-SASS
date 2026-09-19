'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Link2, Link2Off, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Connection {
  _id: string
  provider: string
  displayName: string
  email?: string
  profilePicture?: string
  tokenExpiresAt?: string
  scopes: string[]
}

interface OAuthConnectButtonProps {
  provider: 'linkedin' | 'meta'
  workspaceId: string
  label: string
  icon?: React.ReactNode
}

export function OAuthConnectButton({
  provider,
  workspaceId,
  label,
  icon,
}: OAuthConnectButtonProps) {
  const [connecting, setConnecting] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConnections = useCallback(async () => {
    if (!workspaceId) {
      return
    }
    try {
      const res = await fetch(
        `/api/oauth/connections?workspaceId=${workspaceId}&provider=${provider}`
      )
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, provider])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch(
        `/api/oauth/${provider}?workspaceId=${workspaceId}`
      )
      if (!res.ok) {
        throw new Error('Failed to initiate OAuth')
      }
      const { authUrl } = await res.json()

      const popup = window.open(
        authUrl,
        `${provider}-oauth`,
        'width=600,height=700'
      )

      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_SUCCESS') {
          window.removeEventListener('message', handler)
          toast.success(`${label} connected successfully`)
          fetchConnections()
          setConnecting(false)
        } else if (event.data?.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', handler)
          toast.error(`Failed to connect ${label}`)
          setConnecting(false)
        }
      }
      window.addEventListener('message', handler)

      const pollClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollClosed)
          window.removeEventListener('message', handler)
          setConnecting(false)
        }
      }, 500)
    } catch {
      toast.error(`Failed to connect ${label}`)
      setConnecting(false)
    }
  }

  const handleDisconnect = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/oauth/connections?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error()
      }
      toast.success(`${name} disconnected`)
      fetchConnections()
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  return (
    <div className="space-y-3">
      {connections.map(conn => (
        <div
          key={conn._id}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{conn.displayName}</p>
              {conn.email && (
                <p className="text-xs text-muted-foreground">{conn.email}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDisconnect(conn._id, conn.displayName)}
          >
            <Link2Off className="mr-1 h-4 w-4" />
            Disconnect
          </Button>
        </div>
      ))}

      <Button
        onClick={handleConnect}
        disabled={connecting}
        variant="outline"
        className="w-full"
      >
        {connecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>{icon ?? <Link2 className="mr-2 h-4 w-4" />}</>
        )}
        {connections.length > 0
          ? `Add another ${label} account`
          : `Connect with ${label}`}
      </Button>
    </div>
  )
}
