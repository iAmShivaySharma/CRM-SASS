import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Column, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

const createColumnSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  color: z.string().min(1).default('bg-blue-100'),
  projectId: z.string(),
  order: z.number().min(0).optional(),
})

async function checkProjectColumnAccess(projectId: string, userId: string) {
  const project = await Project.findById(projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    status: 'active',
  })

  if (
    !projectMember &&
    project.visibility !== 'workspace' &&
    project.visibility !== 'public'
  ) {
    return null
  }

  return project
}

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

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
        const projectId = url.searchParams.get('projectId')

        if (!projectId) {
          return NextResponse.json(
            { message: 'Project ID is required' },
            { status: 400 }
          )
        }

        const project = await checkProjectColumnAccess(projectId, auth.user.id)
        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const columns = await Column.find({ projectId })
          .sort({ order: 1, createdAt: 1 })
          .lean()

        if (columns.length === 0) {
          const defaultColumns = [
            { name: 'To Do', slug: 'todo', color: '#gray-100', order: 0 },
            {
              name: 'In Progress',
              slug: 'in-progress',
              color: '#blue-100',
              order: 1,
            },
            { name: 'Review', slug: 'review', color: '#yellow-100', order: 2 },
            { name: 'Done', slug: 'done', color: '#green-100', order: 3 },
          ]

          const createdColumns = await Column.insertMany(
            defaultColumns.map(col => ({
              ...col,
              projectId,
              workspaceId: project.workspaceId,
              isDefault: true,
              createdBy: auth.user.id,
            }))
          )

          const formattedColumns = createdColumns.map(col => ({
            ...col.toObject(),
            id: col._id,
          }))

          return NextResponse.json({ columns: formattedColumns })
        }

        const formattedColumns = columns.map(col => ({
          ...col,
          id: col._id,
        }))

        await logUserActivity(
          auth.user.id,
          'columns.list',
          `Listed columns for project: ${project.name}`,
          { projectId }
        )

        return NextResponse.json({ columns: formattedColumns })
      } catch (error) {
        log.error('Get columns error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.stack
                  : undefined
                : undefined,
          },
          { status: 500 }
        )
      }
    },
    {
      logBody: false,
      logHeaders: true,
    }
  )
)

export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

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

        const validationResult = createColumnSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const project = await checkProjectColumnAccess(
          validationResult.data.projectId,
          auth.user.id
        )
        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const lastColumn = await Column.findOne({
          projectId: validationResult.data.projectId,
        }).sort({ order: -1 })

        const order =
          validationResult.data.order ?? (lastColumn ? lastColumn.order + 1 : 0)

        const column = new Column({
          ...validationResult.data,
          workspaceId: project.workspaceId,
          createdBy: auth.user.id,
          order,
        })

        await column.save()

        await logUserActivity(
          auth.user.id,
          'columns.create',
          `Created column: ${column.name}`,
          { columnId: column._id, projectId: validationResult.data.projectId }
        )

        return NextResponse.json({
          column: {
            ...column.toJSON(),
            id: column._id,
          },
        })
      } catch (error) {
        log.error('Create column error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.stack
                  : undefined
                : undefined,
          },
          { status: 500 }
        )
      }
    },
    {
      logBody: true,
      logHeaders: true,
    }
  )
)
