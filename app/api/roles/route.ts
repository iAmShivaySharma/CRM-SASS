import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Role, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).optional(),
})

// GET /api/roles - Get roles for a workspace
export const GET = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()

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

      // Verify user has access to this workspace
      const member = await WorkspaceMember.findOne({
        userId: auth.user.id,
        workspaceId,
        status: 'active',
      })

      if (!member) {
        return NextResponse.json({ message: 'Access denied' }, { status: 403 })
      }

      // Get roles for the workspace
      const roles = await Role.find({ workspaceId })
        .sort({ isDefault: -1, name: 1 })
        .lean()

      logUserActivity(auth.user.id, 'roles.list', 'role', {
        workspaceId,
        count: roles.length,
      })

      return NextResponse.json({
        success: true,
        roles: roles.map(role => ({
          ...role,
          id: role._id,
        })),
      })
    } catch (error) {
      log.error('Get roles error:', error)
      return NextResponse.json({ message: 'Server error' }, { status: 500 })
    }
  })
)

// POST /api/roles - Create a new role
export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()

    try {
      await connectToMongoDB()

      const auth = await verifyAuthToken(request)
      if (!auth) {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        )
      }

      const body = await request.json()
      const url = new URL(request.url)
      const workspaceId =
        url.searchParams.get('workspaceId') || body.workspaceId

      if (!workspaceId) {
        return NextResponse.json(
          { message: 'Workspace ID is required' },
          { status: 400 }
        )
      }

      // Validate input
      const validationResult = createRoleSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          {
            message: 'Invalid input',
            errors: validationResult.error.errors,
          },
          { status: 400 }
        )
      }

      // Verify user has access to this workspace
      const member = await WorkspaceMember.findOne({
        userId: auth.user.id,
        workspaceId,
        status: 'active',
      })

      if (!member) {
        return NextResponse.json({ message: 'Access denied' }, { status: 403 })
      }

      // Check if role name already exists in workspace
      const existingRole = await Role.findOne({
        workspaceId,
        name: validationResult.data.name,
      })

      if (existingRole) {
        return NextResponse.json(
          { message: 'Role name already exists in this workspace' },
          { status: 409 }
        )
      }

      // Create role
      const roleData = {
        ...validationResult.data,
        workspaceId,
        permissions: validationResult.data.permissions || [],
        isDefault: false,
        createdBy: auth.user.id,
      }

      const role = new Role(roleData)
      await role.save()

      logUserActivity(auth.user.id, 'role.create', 'role', {
        workspaceId,
        roleId: role._id,
        roleName: role.name,
      })

      logBusinessEvent('role_created', auth.user.id, workspaceId, {
        roleId: role._id,
        roleName: role.name,
      })

      return NextResponse.json(
        {
          success: true,
          role: {
            ...role.toJSON(),
            id: role._id,
          },
        },
        { status: 201 }
      )
    } catch (error) {
      log.error('Create role error:', error)
      return NextResponse.json({ message: 'Server error' }, { status: 500 })
    }
  })
)
