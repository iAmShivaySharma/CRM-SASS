import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgProduct } from '@/lib/mongodb/models/FmcgProduct'

const createProductSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(200),
  sku: z.string().min(1),
  hsnCode: z.string().optional(),
  fssaiProductCode: z.string().optional(),
  category: z.string().min(1),
  subCategory: z.string().optional(),
  description: z.string().max(1000).optional(),
  ingredients: z.string().max(5000).optional(),
  allergens: z.array(z.string()).optional(),
  netWeight: z.number().optional(),
  weightUnit: z.enum(['g', 'kg', 'ml', 'l', 'units']).optional(),
  shelfLife: z.number().optional(),
  storageConditions: z.string().optional(),
  mrp: z.number().optional(),
  manufacturerName: z.string().min(1),
  manufacturerAddress: z.string().min(1),
  brandName: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const search = url.searchParams.get('search')
        const category = url.searchParams.get('category')
        const isActiveParam = url.searchParams.get('isActive')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const query: any = { workspaceId }

        if (category) query.category = category
        if (isActiveParam !== null) query.isActive = isActiveParam === 'true'
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { brandName: { $regex: search, $options: 'i' } },
            { manufacturerName: { $regex: search, $options: 'i' } },
          ]
        }

        const skip = (page - 1) * limit

        const [products, total] = await Promise.all([
          FmcgProduct.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          FmcgProduct.countDocuments(query),
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
        log.error('Get FMCG products error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
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
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const validation = createProductSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...productData } = validation.data

        const existing = await FmcgProduct.findOne({ workspaceId, sku: productData.sku })
        if (existing) {
          return NextResponse.json({ message: 'SKU already exists in this workspace' }, { status: 409 })
        }

        const product = await FmcgProduct.create({
          ...productData,
          workspaceId,
          createdBy: auth.user.id,
        })

        logUserActivity(auth.user.id, 'fmcg_product_created', 'fmcg_product', {
          productId: product._id,
          productName: product.name,
          workspaceId,
        })

        return NextResponse.json(
          { success: true, message: 'Product created successfully', product: product.toJSON() },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create FMCG product error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)
