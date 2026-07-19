export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { User } from '@/lib/mongodb/models/User'
import { Workspace } from '@/lib/mongodb/models/Workspace'
import { WorkspaceMember } from '@/lib/mongodb/models/WorkspaceMember'
import { Role } from '@/lib/mongodb/models/Role'

// POST /api/auth/verify - Verify JWT token validity
export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()

    try {
      // Verify the token from the request
      const authResult = await verifyAuthToken(request)

      if (!authResult) {
        log.warn('Token verification failed', {
          path: request.nextUrl.pathname,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          duration: Date.now() - startTime,
        })

        return NextResponse.json(
          {
            valid: false,
            message: 'Invalid or expired token',
          },
          { status: 401 }
        )
      }

      await connectToMongoDB()

      const user = authResult.user
      const lastActiveWsId = user.lastActiveWorkspaceId

      let workspaceMembership
      if (lastActiveWsId) {
        workspaceMembership = await WorkspaceMember.findOne({
          userId: user.id,
          workspaceId: lastActiveWsId,
          status: 'active',
        })
          .populate('workspaceId')
          .populate('roleId')
      }

      if (!workspaceMembership) {
        workspaceMembership = await WorkspaceMember.findOne({
          userId: user.id,
          status: 'active',
        })
          .populate('workspaceId')
          .populate('roleId')
          .sort({ createdAt: 1 })
      }

      const defaultWorkspace = workspaceMembership?.workspaceId
      const userRole = workspaceMembership?.roleId as any
      const userPermissions: string[] = userRole?.permissions || []

      log.info('Token verification successful', {
        userId: authResult.user.id,
        email: authResult.user.email,
        workspaceId: defaultWorkspace?._id,
        duration: Date.now() - startTime,
      })

      return NextResponse.json({
        valid: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          fullName: authResult.user.fullName,
          name: authResult.user.fullName,
          role: userRole?.name || 'user',
          roleId: userRole?._id?.toString() || '',
          permissions: userPermissions,
          workspaceId: defaultWorkspace?._id?.toString() || '',
        },
        workspace: defaultWorkspace
          ? {
              id: defaultWorkspace._id.toString(),
              name: defaultWorkspace.name,
              planId: defaultWorkspace.planId || 'free',
              memberCount: 1, // We'll calculate this properly later if needed
              currency: defaultWorkspace.currency || 'USD',
              timezone: defaultWorkspace.timezone || 'UTC',
              settings: defaultWorkspace.settings || {
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                weekStartsOn: 0,
                language: 'en',
              },
              createdAt: defaultWorkspace.createdAt,
            }
          : null,
      })
    } catch (error) {
      log.error('Token verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      })

      return NextResponse.json(
        {
          valid: false,
          message: 'Token verification failed',
        },
        { status: 500 }
      )
    }
  })
)
