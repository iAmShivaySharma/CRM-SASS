import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Permission } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { getAvailablePermissions, seedSystemPermissions } from '@/lib/mongodb/seedPermissions'
import { logUserActivity } from '@/lib/logging/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')

    // Get permissions from database
    let permissions = await getAvailablePermissions(workspaceId || undefined)

    // If no permissions exist, seed them first
    if (!permissions || permissions.length === 0) {
      console.log('No permissions found, seeding system permissions...')
      await seedSystemPermissions()
      permissions = await getAvailablePermissions(workspaceId || undefined)
    }

    // Use the permissions directly - no format conversion needed
    const formattedPermissions = permissions.map(perm => ({
      id: perm.name,
      name: perm.displayName,
      resource: perm.resource,
      action: perm.action,
      category: perm.category,
      description: perm.description,
      dependencies: perm.dependencies,
      conflictsWith: perm.conflictsWith,
      isSystemPermission: perm.isSystemPermission,
    }))

    logUserActivity(auth.user.id, 'permissions.list', 'permission', {
      workspaceId,
      count: permissions.length,
    })

    return NextResponse.json(formattedPermissions)
  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json(
      { message: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}
