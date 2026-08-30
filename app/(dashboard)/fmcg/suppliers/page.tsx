'use client'

import { useAppSelector } from '@/lib/hooks'
import { SupplierList } from '@/components/fmcg/SupplierList'

export default function SuppliersPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to manage suppliers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage approved suppliers and vendor records for {currentWorkspace.name}
        </p>
      </div>
      <SupplierList workspaceId={currentWorkspace.id} />
    </div>
  )
}
