'use client'

import { useAppSelector } from '@/lib/hooks'
import { TestReportList } from '@/components/fmcg/TestReportList'

export default function TestReportsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to manage test reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Reports</h1>
        <p className="text-muted-foreground">
          Manage lab test reports for {currentWorkspace.name}
        </p>
      </div>
      <TestReportList workspaceId={currentWorkspace.id} />
    </div>
  )
}
