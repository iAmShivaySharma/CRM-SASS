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

const createTaskSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([
    'llp_mca',
    'gst',
    'tds',
    'income_tax',
    'fssai',
    'trademark',
    'banking',
    'other',
  ]),
  dueDate: z.string().min(1),
  financialYear: z.string().min(1),
  period: z.string().optional(),
  status: z
    .enum(['pending', 'completed', 'overdue', 'not_applicable'])
    .optional(),
  completedDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  amount: z.number().optional(),
  notes: z.string().optional(),
  reminderDays: z.number().default(7),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  portalUrl: z.string().optional(),
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
        const status = url.searchParams.get('status')
        const category = url.searchParams.get('category')
        const financialYear = url.searchParams.get('financialYear')
        const dateFrom = url.searchParams.get('dateFrom')
        const dateTo = url.searchParams.get('dateTo')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }
        if (status) query.status = status
        if (category) query.category = category
        if (financialYear) query.financialYear = financialYear
        if (dateFrom || dateTo) {
          query.dueDate = {}
          if (dateFrom) query.dueDate.$gte = new Date(dateFrom)
          if (dateTo) query.dueDate.$lte = new Date(dateTo)
        }

        const skip = (page - 1) * limit

        const [tasks, total] = await Promise.all([
          ComplianceTask.find(query)
            .sort({ dueDate: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          ComplianceTask.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          tasks: tasks.map((t: any) => ({ ...t, id: t._id })),
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
        log.error('Get compliance tasks error:', error)
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
        const validation = createTaskSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...taskData } = validation.data

        const task = await ComplianceTask.create({
          ...taskData,
          workspaceId,
          dueDate: new Date(taskData.dueDate),
          completedDate: taskData.completedDate
            ? new Date(taskData.completedDate)
            : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'compliance_task_created',
          'compliance_task',
          {
            taskId: task._id,
            title: task.title,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Task created successfully',
            task: task.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create compliance task error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
