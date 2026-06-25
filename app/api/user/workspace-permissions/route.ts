import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkspaceMember } from '@/lib/mongodb/models/WorkspaceMember'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'

// GET /api/user/workspace-permissions?workspaceId=X
// Returns the user's role and permissions for a specific workspace
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
          { message: 'workspaceId is required' },
          { status: 400 }
        )
      }

      const membership = await WorkspaceMember.findOne({
        userId: auth.user.id,
        workspaceId,
        status: 'active',
      }).populate('roleId')

      if (!membership) {
        return NextResponse.json(
          { message: 'Not a member of this workspace' },
          { status: 403 }
        )
      }

      const role = membership.roleId as any

      return NextResponse.json({
        role: role?.name || 'user',
        roleId: role?._id?.toString() || '',
        permissions: role?.permissions || [],
      })
    } catch (error) {
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)
