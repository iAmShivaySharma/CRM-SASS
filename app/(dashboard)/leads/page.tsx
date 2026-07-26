'use client'

import { LeadList } from '@/components/leads/LeadList'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'

export default function LeadsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()

  if (!permissionsLoading && !hasPermission(Permission.LEADS_VIEW)) {
    return <AccessDenied />
  }

  return (
    <div className="w-full">
      <LeadList />
    </div>
  )
}
