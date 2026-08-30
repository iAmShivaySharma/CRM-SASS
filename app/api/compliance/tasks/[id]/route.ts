import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { ComplianceTask } from '@/lib/mongodb/models/ComplianceTask'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z
    .enum([
      'llp_mca',
      'gst',
      'tds',
      'income_tax',
      'fssai',
      'trademark',
      'banking',
      'other',
    ])
    .optional(),
  dueDate: z.string().optional(),
  financialYear: z.string().optional(),
  period: z.string().optional(),
  status: z
    .enum(['pending', 'completed', 'overdue', 'not_applicable'])
    .optional(),
  completedDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  amount: z.number().optional(),
  notes: z.string().optional(),
  reminderDays: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  portalUrl: z.string().optional(),
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

        const task = await ComplianceTask.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!task) {
          return NextResponse.json(
            { message: 'Task not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          task: { ...(task as any), id: (task as any)._id },
        })
      } catch (error) {
        log.error('Get compliance task error:', error)
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
        const { workspaceId, ...rest } = body
        const validation = updateTaskSchema.safeParse(rest)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.dueDate)
          updateData.dueDate = new Date(updateData.dueDate)
        if (updateData.completedDate)
          updateData.completedDate = new Date(updateData.completedDate)

        const task = await ComplianceTask.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        ).lean()

        if (!task) {
          return NextResponse.json(
            { message: 'Task not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'compliance_task_updated',
          'compliance_task',
          {
            taskId: id,
            workspaceId,
          }
        )

        return NextResponse.json({
          success: true,
          task: { ...(task as any), id: (task as any)._id },
        })
      } catch (error) {
        log.error('Update compliance task error:', error)
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

        const task = await ComplianceTask.findOneAndDelete({
          _id: id,
          workspaceId,
        })
        if (!task) {
          return NextResponse.json(
            { message: 'Task not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'compliance_task_deleted',
          'compliance_task',
          {
            taskId: id,
            workspaceId,
          }
        )

        return NextResponse.json({
          success: true,
          message: 'Task deleted successfully',
        })
      } catch (error) {
        log.error('Delete compliance task error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
