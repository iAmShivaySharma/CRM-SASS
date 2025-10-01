/**
 * Workspace Roles API Endpoint
 *
 * Handles CRUD operations for workspace roles including:
 * - GET: List all roles in workspace
 * - POST: Create new role with permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { requireAuth } from '@/lib/security/auth-middleware'
import { Role, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import {
  logUserActivity,
  logBusinessEvent,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'
import { rateLimit } from '@/lib/security/rate-limiter'
import { getClientIP } from '@/lib/utils/ip-utils'
import { z } from 'zod'
import mongoose from 'mongoose'

import { getAvailablePermissions, seedSystemPermissions } from '@/lib/mongodb/seedPermissions'

// Validation schemas
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name contains invalid characters'),
  description: z
    .string()
    .max(255, 'Description must be less than 255 characters')
    .optional(),
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required'),
})

// GET /api/workspaces/[id]/roles - List workspace roles
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Authentication
        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const userId = auth.user.id
        const workspaceId = params.id

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Check if user has permission to view roles
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            {
              message: 'Access denied. You are not a member of this workspace.',
            },
            { status: 403 }
          )
        }

        // Check permissions
        const userPermissions = membership.roleId?.permissions || []
        if (
          !userPermissions.includes('roles.view') &&
          !['Owner', 'Admin'].includes(membership.roleId?.name)
        ) {
          return NextResponse.json(
            {
              message: 'Access denied. Insufficient permissions to view roles.',
            },
            { status: 403 }
          )
        }

        // Get all roles for the workspace
        const roles = await Role.find({ workspaceId }).sort({ createdAt: 1 })

        // Get member count for each role
        const rolesWithCounts = await Promise.all(
          roles.map(async role => {
            const memberCount = await WorkspaceMember.countDocuments({
              workspaceId,
              roleId: role._id,
              status: 'active',
            })

            return {
              id: role._id,
              name: role.name,
              description: role.description,
              permissions: role.permissions,
              isDefault: role.isDefault,
              memberCount,
              createdAt: role.createdAt,
              updatedAt: role.updatedAt,
            }
          })
        )

        // Log successful access
        logUserActivity(userId, 'roles_viewed', 'workspace', {
          workspaceId,
          roleCount: roles.length,
        })

        logBusinessEvent('roles_accessed', userId, workspaceId, {
          roleCount: roles.length,
          duration: Date.now() - startTime,
        })

        log.info(
          `Roles retrieved for workspace ${workspaceId} by user ${userId}`,
          {
            workspaceId,
            userId,
            roleCount: roles.length,
            duration: Date.now() - startTime,
          }
        )

        // Get available permissions for this workspace
        let availablePermissions = await getAvailablePermissions(workspaceId)

        // If no permissions exist, seed them first
        if (!availablePermissions || availablePermissions.length === 0) {
          await seedSystemPermissions()
          availablePermissions = await getAvailablePermissions(workspaceId)
        }

        // Format permissions for frontend
        const formattedPermissions = availablePermissions.map(perm => ({
          id: perm.name,
          name: perm.displayName,
          resource: perm.resource,
          action: perm.action,
          category: perm.category,
          description: perm.description,
          dependencies: perm.dependencies,
          isSystemPermission: perm.isSystemPermission,
        }))

        return NextResponse.json({
          success: true,
          roles: rolesWithCounts,
          availablePermissions: formattedPermissions,
        })
      } catch (error) {
        log.error('Error retrieving workspace roles:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to retrieve workspace roles',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)

// POST /api/workspaces/[id]/roles - Create new role
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Rate limiting
        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'api')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }

        // Authentication
        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const workspaceId = params.id

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Parse and validate request body
        const body = await request.json()
        const validationResult = createRoleSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { name, description, permissions } = validationResult.data

        // Validate permissions exist
        const availablePermissions = await getAvailablePermissions(workspaceId)
        const availablePermissionNames = availablePermissions.map(p => p.name)

        const invalidPermissions = permissions.filter(p => !availablePermissionNames.includes(p))
        if (invalidPermissions.length > 0) {
          return NextResponse.json(
            {
              message: 'Invalid permissions provided',
              invalidPermissions,
            },
            { status: 400 }
          )
        }

        // Check if user has permission to create roles
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            {
              message: 'Access denied. You are not a member of this workspace.',
            },
            { status: 403 }
          )
        }

        // Check permissions
        const userPermissions = membership.roleId?.permissions || []
        if (
          !userPermissions.includes('roles.create') &&
          !['Owner', 'Admin'].includes(membership.roleId?.name)
        ) {
          return NextResponse.json(
            {
              message:
                'Access denied. Insufficient permissions to create roles.',
            },
            { status: 403 }
          )
        }

        // Check if role name already exists in workspace
        const existingRole = await Role.findOne({ workspaceId, name })
        if (existingRole) {
          return NextResponse.json(
            {
              message: 'A role with this name already exists in the workspace',
            },
            { status: 409 }
          )
        }

        // Create new role
        const newRole = new Role({
          workspaceId,
          name,
          description,
          permissions,
          isDefault: false,
        })

        await newRole.save()

        // Log successful creation
        logUserActivity(userId, 'role_created', 'workspace', {
          workspaceId,
          roleId: newRole._id,
          roleName: name,
          permissions,
        })

        logBusinessEvent('role_created', userId, workspaceId, {
          roleId: newRole._id,
          roleName: name,
          permissionCount: permissions.length,
          duration: Date.now() - startTime,
        })

        log.info(`Role created in workspace ${workspaceId} by user ${userId}`, {
          workspaceId,
          userId,
          roleId: newRole._id,
          roleName: name,
          duration: Date.now() - startTime,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Role created successfully',
            role: {
              id: newRole._id,
              name: newRole.name,
              description: newRole.description,
              permissions: newRole.permissions,
              isDefault: newRole.isDefault,
              memberCount: 0,
              createdAt: newRole.createdAt,
              updatedAt: newRole.updatedAt,
            },
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Error creating workspace role:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to create workspace role',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)
