import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Column, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const createColumnSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
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

  if (!projectMember && project.visibility !== 'workspace' && project.visibility !== 'public') {
    return null
  }

  return project
}

// GET /api/columns - Get columns for a project
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== COLUMNS API DEBUG START ===')

      try {
        console.log('Connecting to MongoDB...')
        await connectToMongoDB()
        console.log('MongoDB connected successfully')

        console.log('Verifying auth token...')
        const auth = await verifyAuthToken(request)
        if (!auth) {
          console.log('Auth failed, returning 401')
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const url = new URL(request.url)
        const projectId = url.searchParams.get('projectId')

        console.log('Request params:', { projectId })

        if (!projectId) {
          return NextResponse.json(
            { message: 'Project ID is required' },
            { status: 400 }
          )
        }

        console.log('Checking project access...')
        const project = await checkProjectColumnAccess(projectId, auth.user.id)
        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        console.log('Project access confirmed')

        const columns = await Column.find({ projectId })
          .sort({ order: 1, createdAt: 1 })
          .lean()

        console.log('Retrieved columns:', columns.length)

        // If no columns exist, create default ones
        if (columns.length === 0) {
          console.log('Creating default columns...')
          const defaultColumns = [
            { name: 'To Do', slug: 'todo', color: '#gray-100', order: 0 },
            { name: 'In Progress', slug: 'in-progress', color: '#blue-100', order: 1 },
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

          console.log('Created default columns:', formattedColumns.length)

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
          'Column',
          projectId,
          { projectId }
        )

        const endTime = Date.now()
        console.log(`=== COLUMNS API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({ columns: formattedColumns })
      } catch (error) {
        console.error('=== COLUMNS API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// POST /api/columns - Create a new column
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== CREATE COLUMN API DEBUG START ===')

      try {
        console.log('Connecting to MongoDB...')
        await connectToMongoDB()
        console.log('MongoDB connected successfully')

        console.log('Verifying auth token...')
        const auth = await verifyAuthToken(request)
        if (!auth) {
          console.log('Auth failed, returning 401')
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))

        const validationResult = createColumnSchema.safeParse(body)

        if (!validationResult.success) {
          console.log('Validation failed:', validationResult.error.errors)
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        console.log('Checking project access...')
        const project = await checkProjectColumnAccess(validationResult.data.projectId, auth.user.id)
        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        console.log('Project access confirmed')

        // Get the highest order number
        const lastColumn = await Column.findOne({
          projectId: validationResult.data.projectId,
        }).sort({ order: -1 })

        const order = validationResult.data.order ?? (lastColumn ? lastColumn.order + 1 : 0)

        console.log('Creating new column with order:', order)

        const column = new Column({
          ...validationResult.data,
          workspaceId: project.workspaceId,
          createdBy: auth.user.id,
          order,
        })

        await column.save()
        console.log('Column created with ID:', column._id)

        await logUserActivity(
          auth.user.id,
          'columns.create',
          `Created column: ${column.name}`,
          'Column',
          column._id.toString(),
          { columnId: column._id, projectId: validationResult.data.projectId }
        )

        const endTime = Date.now()
        console.log(`=== CREATE COLUMN API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          column: {
            ...column.toJSON(),
            id: column._id,
          },
        })
      } catch (error) {
        console.error('=== CREATE COLUMN API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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