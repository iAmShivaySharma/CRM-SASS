import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Product } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  hsnSac: z.string().max(20).optional(),
  unit: z.string().max(20).optional(),
  buyPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  location: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
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

        const product = await Product.findOne({ _id: id, workspaceId })
        if (!product) {
          return NextResponse.json(
            { message: 'Product not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ success: true, product: product.toJSON() })
      } catch (error) {
        log.error('Get product error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateProductSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const product = await Product.findOne({ _id: id, workspaceId })
        if (!product) {
          return NextResponse.json(
            { message: 'Product not found' },
            { status: 404 }
          )
        }

        Object.assign(product, validationResult.data)
        await product.save()

        return NextResponse.json({
          success: true,
          message: 'Product updated',
          product: product.toJSON(),
        })
      } catch (error) {
        log.error('Update product error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id } = await params
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
          'leads.delete'
        )
        if (permError) return permError

        const product = await Product.findOne({ _id: id, workspaceId })
        if (!product) {
          return NextResponse.json(
            { message: 'Product not found' },
            { status: 404 }
          )
        }

        product.isActive = false
        await product.save()

        return NextResponse.json({ success: true, message: 'Product deleted' })
      } catch (error) {
        log.error('Delete product error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
