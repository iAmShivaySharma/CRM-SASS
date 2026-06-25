import { NextResponse } from 'next/server'
import { WorkspaceMember } from '@/lib/mongodb/models'

/**
 * Check if a user has a specific permission in a workspace.
 * Returns null if permitted, or a 403 NextResponse if denied.
 */
export async function checkPermission(
  userId: string,
  workspaceId: string,
  requiredPermission: string
): Promise<NextResponse | null> {
  const membership = await WorkspaceMember.findOne({
    userId,
    workspaceId,
    status: 'active',
  }).populate('roleId')

  if (!membership) {
    return NextResponse.json(
      { message: 'Access denied. You are not a member of this workspace.' },
      { status: 403 }
    )
  }

  const role = membership.roleId as any
  const permissions: string[] = role?.permissions || []

  if (hasPermission(permissions, requiredPermission)) {
    return null
  }

  return NextResponse.json(
    { message: 'Insufficient permissions' },
    { status: 403 }
  )
}

/**
 * Check if a user has any of the specified permissions.
 * Returns null if permitted, or a 403 NextResponse if denied.
 */
export async function checkAnyPermission(
  userId: string,
  workspaceId: string,
  requiredPermissions: string[]
): Promise<NextResponse | null> {
  const membership = await WorkspaceMember.findOne({
    userId,
    workspaceId,
    status: 'active',
  }).populate('roleId')

  if (!membership) {
    return NextResponse.json(
      { message: 'Access denied. You are not a member of this workspace.' },
      { status: 403 }
    )
  }

  const role = membership.roleId as any
  const permissions: string[] = role?.permissions || []

  const hasAny = requiredPermissions.some(rp => hasPermission(permissions, rp))
  if (hasAny) {
    return null
  }

  return NextResponse.json(
    { message: 'Insufficient permissions' },
    { status: 403 }
  )
}

function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  if (userPermissions.includes('*:*')) return true

  const [resource] = requiredPermission.split('.')
  if (userPermissions.includes(`${resource}.*`)) return true

  return userPermissions.includes(requiredPermission)
}
