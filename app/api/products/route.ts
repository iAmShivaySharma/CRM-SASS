import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Product, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  hsnSac: z.string().max(20).optional(),
  unit: z.string().max(20).optional(),
  buyPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  currentStock: z.number().optional(),
  lowStockThreshold: z.number().min(0).optional(),
  location: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
})

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
        const category = url.searchParams.get('category')
        const search = url.searchParams.get('search')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const sortBy = url.searchParams.get('sortBy') || 'name'
        const sortOrder = url.searchParams.get('sortOrder') || 'asc'
        const skip = (page - 1) * limit

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

        const query: any = { workspaceId, isActive: true }
        if (category) query.category = category
        if (search) query.$text = { $search: search }

        const sortMap: Record<string, any> = {
          name: { name: sortOrder === 'asc' ? 1 : -1 },
          sku: { sku: sortOrder === 'asc' ? 1 : -1 },
          currentStock: { currentStock: sortOrder === 'asc' ? 1 : -1 },
          sellPrice: { sellPrice: sortOrder === 'asc' ? 1 : -1 },
          createdAt: { createdAt: sortOrder === 'asc' ? 1 : -1 },
        }
        const sortOption = search
          ? { score: { $meta: 'textScore' } }
          : sortMap[sortBy] || { name: 1 }

        const [products, total] = await Promise.all([
          Product.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
          Product.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          products: products.map((p: any) => ({ ...p, id: p._id })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        })
      } catch (error) {
        log.error('Get products error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const POST = withSecurityLogging(
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

        const body = await request.json()
        const validationResult = createProductSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = body
        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const product = await Product.create({
          ...validationResult.data,
          workspaceId,
          createdBy: auth.user.id,
        })

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'created',
          entityType: 'product',
          entityId: product._id.toString(),
          description: `Added product "${product.name}" (SKU: ${product.sku})`,
        })

        logBusinessEvent('product_created', auth.user.id, workspaceId, {
          productId: product._id,
          name: product.name,
          sku: product.sku,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Product created',
            product: product.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'A product with this SKU already exists' },
            { status: 400 }
          )
        }
        log.error('Create product error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
