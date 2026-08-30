'use client'

import { useAppSelector } from '@/lib/hooks'
import { BatchList } from '@/components/fmcg/BatchList'

export default function BatchesPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to manage batches.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
        <p className="text-muted-foreground">
          Manage production batches for {currentWorkspace.name}
        </p>
      </div>
      <BatchList workspaceId={currentWorkspace.id} />
    </div>
  )
}
