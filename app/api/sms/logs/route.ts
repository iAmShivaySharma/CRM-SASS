import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { SmsLog } from '@/lib/mongodb/models/SmsLog'

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
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const status = url.searchParams.get('status')
      const type = url.searchParams.get('type')
      const search = url.searchParams.get('search')
      const dateFrom = url.searchParams.get('dateFrom')
      const dateTo = url.searchParams.get('dateTo')

      if (!workspaceId) {
        return NextResponse.json(
          { message: 'workspaceId is required' },
          { status: 400 }
        )
      }

      const permError = await checkPermission(
        auth.user.id,
        workspaceId,
        'leads.view'
      )
      if (permError) return permError

      const filter: Record<string, any> = { workspaceId }

      if (status) filter.status = status
      if (type) filter.type = type
      if (search) {
        filter.$or = [
          { to: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
        ]
      }
      if (dateFrom || dateTo) {
        filter.sentAt = {}
        if (dateFrom) filter.sentAt.$gte = new Date(dateFrom)
        if (dateTo) {
          const end = new Date(dateTo)
          end.setHours(23, 59, 59, 999)
          filter.sentAt.$lte = end
        }
      }

      const skip = (page - 1) * limit
      const [logs, total] = await Promise.all([
        SmsLog.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
        SmsLog.countDocuments(filter),
      ])

      return NextResponse.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      log.error('Get SMS logs error:', error)
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)
