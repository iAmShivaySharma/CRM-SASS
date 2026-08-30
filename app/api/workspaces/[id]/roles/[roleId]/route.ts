import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Role, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { getPermissionsForAPI } from '@/lib/permissions/constants'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId, roleId } = await params
    const { name, description, permissions } = await request.json()

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: auth.user.id,
      status: 'active',
    }).populate('roleId')

    if (!membership) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const userPermissions = (membership.roleId as any)?.permissions || []
    if (
      !userPermissions.includes('roles.edit') &&
      !['Owner', 'Admin'].includes((membership.roleId as any)?.name)
    ) {
      return NextResponse.json(
        { message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const role = await Role.findOne({ _id: roleId, workspaceId })
    if (!role) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 })
    }

    if (role.name === 'Owner') {
      return NextResponse.json(
        { message: 'Cannot modify the Owner role' },
        { status: 400 }
      )
    }

    if (permissions) {
      const availablePermissions = getPermissionsForAPI().map(p => p.id)
      const invalid = permissions.filter(
        (p: string) => !availablePermissions.includes(p)
      )
      if (invalid.length > 0) {
        return NextResponse.json(
          { message: 'Invalid permissions', invalidPermissions: invalid },
          { status: 400 }
        )
      }
      role.permissions = permissions
    }

    if (name !== undefined) {
      const existing = await Role.findOne({
        workspaceId,
        name,
        _id: { $ne: roleId },
      })
      if (existing) {
        return NextResponse.json(
          { message: 'A role with this name already exists' },
          { status: 409 }
        )
      }
      role.name = name
    }

    if (description !== undefined) {
      role.description = description
    }

    await role.save()

    return NextResponse.json({
      success: true,
      role: {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isDefault: role.isDefault,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update role' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId, roleId } = await params

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: auth.user.id,
      status: 'active',
    }).populate('roleId')

    if (!membership) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const userPermissions = (membership.roleId as any)?.permissions || []
    if (
      !userPermissions.includes('roles.delete') &&
      !['Owner', 'Admin'].includes((membership.roleId as any)?.name)
    ) {
      return NextResponse.json(
        { message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const role = await Role.findOne({ _id: roleId, workspaceId })
    if (!role) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 })
    }

    if (role.name === 'Owner' || role.isDefault) {
      return NextResponse.json(
        { message: 'Cannot delete default or Owner roles' },
        { status: 400 }
      )
    }

    const membersWithRole = await WorkspaceMember.countDocuments({
      workspaceId,
      roleId,
      status: 'active',
    })

    if (membersWithRole > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete role — ${membersWithRole} member(s) are assigned to it. Reassign them first.`,
        },
        { status: 400 }
      )
    }

    await Role.findByIdAndDelete(roleId)

    return NextResponse.json({
      success: true,
      message: 'Role deleted',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete role' },
      { status: 500 }
    )
  }
}
