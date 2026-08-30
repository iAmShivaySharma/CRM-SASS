'use client'

import { RoleManager } from '@/components/roles/RoleManager'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'

export default function RolesPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()

  if (!permissionsLoading && !hasPermission(Permission.ROLES_VIEW)) {
    return <AccessDenied />
  }

  return (
    <div className="w-full">
      <RoleManager />
    </div>
  )
}
