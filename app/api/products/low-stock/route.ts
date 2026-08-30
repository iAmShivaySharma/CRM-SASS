import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Product } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
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

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const lowStockProducts = await Product.find({
          workspaceId,
          isActive: true,
          $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
        })
          .sort({ currentStock: 1 })
          .lean()

        const outOfStock = lowStockProducts.filter(
          (p: any) => p.currentStock <= 0
        )
        const lowStock = lowStockProducts.filter((p: any) => p.currentStock > 0)

        return NextResponse.json({
          success: true,
          outOfStock: outOfStock.map((p: any) => ({ ...p, id: p._id })),
          lowStock: lowStock.map((p: any) => ({ ...p, id: p._id })),
          totalAlerts: lowStockProducts.length,
        })
      } catch (error) {
        log.error('Get low stock error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
