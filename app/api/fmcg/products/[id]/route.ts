import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { FmcgProduct } from '@/lib/mongodb/models/FmcgProduct'

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).optional(),
  hsnCode: z.string().optional(),
  fssaiProductCode: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  description: z.string().max(1000).optional(),
  ingredients: z.string().max(5000).optional(),
  allergens: z.array(z.string()).optional(),
  netWeight: z.number().optional(),
  weightUnit: z.enum(['g', 'kg', 'ml', 'l', 'units']).optional(),
  shelfLife: z.number().optional(),
  storageConditions: z.string().optional(),
  mrp: z.number().optional(),
  manufacturerName: z.string().optional(),
  manufacturerAddress: z.string().optional(),
  brandName: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const product = await FmcgProduct.findOne({ _id: id, workspaceId }).lean()
        if (!product) {
          return NextResponse.json({ message: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, product: { ...(product as any), id: (product as any)._id } })
      } catch (error) {
        log.error('Get FMCG product error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const body = await request.json()
        const validation = updateProductSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const product = await FmcgProduct.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: validation.data },
          { new: true }
        )

        if (!product) {
          return NextResponse.json({ message: 'Product not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_product_updated', 'fmcg_product', {
          productId: id,
          workspaceId,
        })

        return NextResponse.json({ success: true, message: 'Product updated successfully', product: product.toJSON() })
      } catch (error) {
        log.error('Update FMCG product error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
        }

        const { id } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json({ message: 'Workspace ID is required' }, { status: 400 })
        }

        const product = await FmcgProduct.findOneAndDelete({ _id: id, workspaceId })

        if (!product) {
          return NextResponse.json({ message: 'Product not found' }, { status: 404 })
        }

        logUserActivity(auth.user.id, 'fmcg_product_deleted', 'fmcg_product', {
          productId: id,
          workspaceId,
        })

        return NextResponse.json({ success: true, message: 'Product deleted successfully' })
      } catch (error) {
        log.error('Delete FMCG product error:', error)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
      }
    }
  )
)
