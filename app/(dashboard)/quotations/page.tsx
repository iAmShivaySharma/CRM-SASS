'use client'

import { useAppSelector } from '@/lib/hooks'
import { Loader2, ClipboardList } from 'lucide-react'
import { useGetQuotationsQuery } from '@/lib/api/quotationApi'

export default function QuotationsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data, isLoading } = useGetQuotationsQuery(
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

  const statusColor = (status: string) => {
    if (status === 'accepted') return 'bg-primary/10 text-primary'
    if (status === 'rejected' || status === 'expired') return 'bg-destructive/10 text-destructive'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Quotations</h1>
      </div>

      <div className="rounded-xl border bg-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.quotations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotations yet.</p>
            ) : (
              (data?.quotations ?? []).map(q => (
                <div key={q._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{q.quotationNumber} — {q.clientName}</p>
                    <p className="text-xs text-muted-foreground">{q.currency} {q.total.toLocaleString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(q.status)}`}>
                    {q.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
