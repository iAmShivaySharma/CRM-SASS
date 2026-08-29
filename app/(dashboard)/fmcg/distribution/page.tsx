'use client'

import { useAppSelector } from '@/lib/hooks'
import { DistributionList } from '@/components/fmcg/DistributionList'

export default function DistributionPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to manage distribution.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distribution</h1>
        <p className="text-muted-foreground">
          Track batch dispatches and distribution records for {currentWorkspace.name}
        </p>
      </div>
      <DistributionList workspaceId={currentWorkspace.id} />
    </div>
  )
}
