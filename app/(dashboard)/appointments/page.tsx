'use client'

import { useAppSelector } from '@/lib/hooks'
import { Loader2, CalendarCheck } from 'lucide-react'
import { useGetAppointmentsQuery } from '@/lib/api/appointmentApi'

export default function AppointmentsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data, isLoading } = useGetAppointmentsQuery(
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
    if (status === 'confirmed' || status === 'completed') return 'bg-primary/10 text-primary'
    if (status === 'cancelled' || status === 'no_show') return 'bg-destructive/10 text-destructive'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <CalendarCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Appointments</h1>
      </div>

      <div className="rounded-xl border bg-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.appointments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            ) : (
              (data?.appointments ?? []).map(a => (
                <div key={a._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{a.clientName}</p>
                    <p className="text-xs text-muted-foreground">{a.date} · {a.startTime} – {a.endTime}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>
                    {a.status}
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
