'use client'

import { useAppSelector } from '@/lib/hooks'
import { Loader2, Smartphone } from 'lucide-react'
import { useGetTemplatesQuery, useGetSmsLogsQuery } from '@/lib/api/smsApi'

export default function SmsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data: templatesData, isLoading: templatesLoading } = useGetTemplatesQuery(
    { workspaceId: currentWorkspace?._id ?? '' },
    { skip: !currentWorkspace }
  )

  const { data: logsData, isLoading: logsLoading } = useGetSmsLogsQuery(
    { workspaceId: currentWorkspace?._id ?? '' },
    { skip: !currentWorkspace }
  )

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Smartphone className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">SMS</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Templates</h2>
          {templatesLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {(templatesData?.templates ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates yet.</p>
              ) : (
                (templatesData?.templates ?? []).map(t => (
                  <div key={t._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Logs</h2>
          {logsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {(logsData?.logs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No SMS logs yet.</p>
              ) : (
                (logsData?.logs ?? []).slice(0, 10).map(log => (
                  <div key={log._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <span className="text-sm">{log.to}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'delivered' ? 'bg-primary/10 text-primary' : log.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
