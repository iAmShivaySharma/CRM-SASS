import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Product, StockMovement } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'
import { NotificationService } from '@/lib/services/notificationService'

const stockUpdateSchema = z.object({
  workspaceId: z.string().min(1),
  type: z.enum(['in', 'out', 'adjustment', 'return', 'damage']),
  quantity: z.number().min(1),
  reason: z.string().max(500).optional(),
  referenceType: z
    .enum(['purchase_order', 'invoice', 'manual', 'return', 'damage'])
    .optional(),
  referenceId: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  vendorId: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

export const POST = withSecurityLogging(
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
        const validationResult = stockUpdateSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const data = validationResult.data

        const permError = await checkPermission(
          auth.user.id,
          data.workspaceId,
          'leads.edit'
        )
        if (permError) return permError

        const product = await Product.findOne({
          _id: id,
          workspaceId: data.workspaceId,
        })
        if (!product) {
          return NextResponse.json(
            { message: 'Product not found' },
            { status: 404 }
          )
        }

        const previousStock = product.currentStock
        let newStock: number

        switch (data.type) {
          case 'in':
          case 'return':
            newStock = previousStock + data.quantity
            break
          case 'out':
          case 'damage':
            if (previousStock < data.quantity) {
              return NextResponse.json(
                {
                  message: `Insufficient stock. Available: ${previousStock}, Requested: ${data.quantity}`,
                },
                { status: 400 }
              )
            }
            newStock = previousStock - data.quantity
            break
          case 'adjustment':
            newStock = data.quantity
            break
          default:
            newStock = previousStock
        }

        await StockMovement.create({
          workspaceId: data.workspaceId,
          productId: id,
          type: data.type,
          quantity: data.quantity,
          previousStock,
          newStock,
          reason: data.reason,
          referenceType: data.referenceType || 'manual',
          referenceId: data.referenceId,
          unitCost: data.unitCost,
          totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
          vendorId: data.vendorId,
          notes: data.notes,
          performedBy: auth.user.id,
        })

        product.currentStock = newStock
        await product.save()

        // Low stock alert
        if (newStock <= product.lowStockThreshold && newStock > 0) {
          await NotificationService.createNotification({
            workspaceId: data.workspaceId,
            title: 'Low Stock Alert',
            message: `${product.name} (SKU: ${product.sku}) is low on stock — ${newStock} ${product.unit} remaining`,
            type: 'warning',
            entityType: 'product',
            entityId: id,
            createdBy: auth.user.id,
            notificationLevel: 'team',
          }).catch(() => {})
        }

        if (newStock === 0) {
          await NotificationService.createNotification({
            workspaceId: data.workspaceId,
            title: 'Out of Stock!',
            message: `${product.name} (SKU: ${product.sku}) is now out of stock`,
            type: 'error',
            entityType: 'product',
            entityId: id,
            createdBy: auth.user.id,
            notificationLevel: 'team',
          }).catch(() => {})
        }

        logBusinessEvent('stock_updated', auth.user.id, data.workspaceId, {
          productId: id,
          sku: product.sku,
          type: data.type,
          quantity: data.quantity,
          previousStock,
          newStock,
        })

        return NextResponse.json({
          success: true,
          message: `Stock ${data.type}: ${data.quantity} ${product.unit}. New stock: ${newStock}`,
          product: product.toJSON(),
        })
      } catch (error) {
        log.error('Stock update error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
