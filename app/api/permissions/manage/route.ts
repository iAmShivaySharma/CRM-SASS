import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Permission, WorkspaceMember } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  validatePermissionDependencies,
  validatePermissionConflicts,
  getAvailablePermissions,
} from '@/lib/mongodb/seedPermissions'
import {
  logUserActivity,
  logBusinessEvent,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'
import { z } from 'zod'

const createPermissionSchema = z.object({
  resource: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Resource must be lowercase with underscores only'
    ),
  action: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Action must be lowercase with underscores only'
    ),
  displayName: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  category: z.enum([
    'Core',
    'Sales',
    'Admin',
    'Analytics',
    'Integration',
    'Custom',
  ]),
  dependencies: z.array(z.string()).optional(),
  conflictsWith: z.array(z.string()).optional(),
})

// POST /api/permissions/manage - Create new custom permission
export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
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

      if (!workspaceId) {
        return NextResponse.json(
          { message: 'Workspace ID is required' },
          { status: 400 }
        )
      }

      // Check if user has permission to create permissions
      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId: auth.user.id,
        status: 'active',
      }).populate('roleId')

      if (!membership) {
        return NextResponse.json(
          { message: 'Access denied. You are not a member of this workspace.' },
          { status: 403 }
        )
      }

      const userPermissions = membership.roleId?.permissions || []
      if (
        !userPermissions.includes('permissions.create') &&
        !['Owner', 'Admin'].includes(membership.roleId?.name)
      ) {
        return NextResponse.json(
          {
            message:
              'Access denied. Insufficient permissions to create permissions.',
          },
          { status: 403 }
        )
      }

      // Validate request body
      const body = await request.json()
      const validationResult = createPermissionSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: 'Validation failed',
            errors: validationResult.error.errors,
          },
          { status: 400 }
        )
      }

      const {
        resource,
        action,
        displayName,
        description,
        category,
        dependencies,
        conflictsWith,
      } = validationResult.data
      const name = `${resource}.${action}`

      // Check if permission already exists
      const existingPermission = await Permission.findOne({
        $or: [
          { name, workspaceId },
          { name, isSystemPermission: true },
        ],
      })

      if (existingPermission) {
        return NextResponse.json(
          { message: 'A permission with this name already exists' },
          { status: 409 }
        )
      }

      // Validate dependencies if provided
      if (dependencies && dependencies.length > 0) {
        const allPermissions = await getAvailablePermissions(workspaceId)
        const validation = validatePermissionDependencies(
          dependencies,
          allPermissions
        )

        if (!validation.valid) {
          return NextResponse.json(
            {
              message: 'Invalid dependencies',
              missingDependencies: validation.missingDependencies,
            },
            { status: 400 }
          )
        }
      }

      // Create new permission
      const newPermission = new Permission({
        workspaceId,
        name,
        resource,
        action,
        displayName,
        description,
        category,
        dependencies,
        conflictsWith,
        isSystemPermission: false,
        isActive: true,
        createdBy: auth.user.id,
      })

      await newPermission.save()

      logUserActivity(auth.user.id, 'permission.create', 'permission', {
        workspaceId,
        permissionId: newPermission._id,
        permissionName: name,
      })

      logBusinessEvent('permission_created', auth.user.id, workspaceId, {
        permissionId: newPermission._id,
        permissionName: name,
        resource,
        action,
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Permission created successfully',
          permission: {
            id: newPermission._id,
            name: newPermission.name,
            displayName: newPermission.displayName,
            description: newPermission.description,
            resource: newPermission.resource,
            action: newPermission.action,
            category: newPermission.category,
            dependencies: newPermission.dependencies,
            conflictsWith: newPermission.conflictsWith,
            isSystemPermission: newPermission.isSystemPermission,
            createdAt: newPermission.createdAt,
            updatedAt: newPermission.updatedAt,
          },
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Error creating permission:', error)
      return NextResponse.json(
        { message: 'Failed to create permission' },
        { status: 500 }
      )
    }
  })
)

// GET /api/permissions/manage - Get detailed permissions for management
export const GET = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
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

      if (!workspaceId) {
        return NextResponse.json(
          { message: 'Workspace ID is required' },
          { status: 400 }
        )
      }

      // Check if user has permission to view permissions
      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId: auth.user.id,
        status: 'active',
      }).populate('roleId')

      if (!membership) {
        return NextResponse.json(
          { message: 'Access denied. You are not a member of this workspace.' },
          { status: 403 }
        )
      }

      const userPermissions = membership.roleId?.permissions || []
      if (
        !userPermissions.includes('permissions.view') &&
        !['Owner', 'Admin'].includes(membership.roleId?.name)
      ) {
        return NextResponse.json(
          {
            message:
              'Access denied. Insufficient permissions to view permissions.',
          },
          { status: 403 }
        )
      }

      // Get all permissions (system + workspace)
      const permissions = await Permission.find({
        $or: [
          { workspaceId, isActive: true },
          { isSystemPermission: true, isActive: true },
        ],
      }).sort({ isSystemPermission: -1, category: 1, resource: 1, action: 1 })

      // Group by category for easier management
      const groupedPermissions = permissions.reduce(
        (acc, perm) => {
          const category = perm.category
          if (!acc[category]) acc[category] = []
          acc[category].push({
            id: perm._id,
            name: perm.name,
            displayName: perm.displayName,
            description: perm.description,
            resource: perm.resource,
            action: perm.action,
            category: perm.category,
            dependencies: perm.dependencies,
            conflictsWith: perm.conflictsWith,
            isSystemPermission: perm.isSystemPermission,
            isActive: perm.isActive,
            createdAt: perm.createdAt,
            updatedAt: perm.updatedAt,
          })
          return acc
        },
        {} as Record<string, any[]>
      )

      logUserActivity(auth.user.id, 'permissions.manage.view', 'permission', {
        workspaceId,
        count: permissions.length,
      })

      return NextResponse.json({
        success: true,
        permissions: groupedPermissions,
        total: permissions.length,
        systemCount: permissions.filter(p => p.isSystemPermission).length,
        customCount: permissions.filter(p => !p.isSystemPermission).length,
      })
    } catch (error) {
      console.error('Error fetching permissions for management:', error)
      return NextResponse.json(
        { message: 'Failed to fetch permissions' },
        { status: 500 }
      )
    }
  })
)
