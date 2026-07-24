'use client'

import { useState, useEffect } from 'react'
import { History, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'

interface Version {
  id: string
  version: number
  title: string
  createdBy?: { fullName?: string }
  createdAt: string
}

interface DocumentVersionHistoryProps {
  documentId: string
  onRestore?: () => void
}

export function DocumentVersionHistory({
  documentId,
  onRestore,
}: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`)
      const data = await response.json()
      if (data.success) {
        setVersions(data.versions)
        setCurrentVersion(data.currentVersion)
      }
    } catch {
      toast.error('Failed to load version history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchVersions()
  }, [open, documentId])

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId)
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        onRestore?.()
        setOpen(false)
      } else {
        toast.error(data.message || 'Failed to restore')
      }
    } catch {
      toast.error('Failed to restore version')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <div className="mb-3 text-sm text-muted-foreground">
            Current version: {currentVersion}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No previous versions
            </p>
          ) : (
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {versions.map(version => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      v{version.version} — {version.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {version.createdBy?.fullName || 'Unknown'} ·{' '}
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(version.id)}
                    disabled={restoring === version.id}
                  >
                    {restoring === version.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
