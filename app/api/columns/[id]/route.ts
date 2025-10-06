import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Column, Project, ProjectMember, Task } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const updateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  order: z.number().min(0).optional(),
})

async function checkColumnAccess(columnId: string, userId: string) {
  const column = await Column.findById(columnId)
  if (!column) return null

  const project = await Project.findById(column.projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId: column.projectId,
    userId,
    status: 'active',
  })

  if (!projectMember && project.visibility !== 'workspace' && project.visibility !== 'public') {
    return null
  }

  return { column, project }
}

// PUT /api/columns/[id] - Update column
export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()
      console.log('=== UPDATE COLUMN API DEBUG START ===')

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

        const { id } = await params
        console.log('Column ID:', id)
        console.log('Checking column access...')
        const columnData = await checkColumnAccess(id, auth.user.id)

        if (!columnData) {
          console.log('Column not found or access denied')
          return NextResponse.json(
            { message: 'Column not found or access denied' },
            { status: 404 }
          )
        }

        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))

        const validationResult = updateColumnSchema.safeParse(body)

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

        console.log('Updating column...')

        // If slug is being updated, also update all tasks with the old slug
        if (validationResult.data.slug && validationResult.data.slug !== columnData.column.slug) {
          console.log('Updating task statuses from', columnData.column.slug, 'to', validationResult.data.slug)
          await Task.updateMany(
            { projectId: columnData.column.projectId, status: columnData.column.slug },
            { status: validationResult.data.slug }
          )
        }

        const updatedColumn = await Column.findByIdAndUpdate(
          id,
          { ...validationResult.data, updatedAt: new Date() },
          { new: true }
        )

        await logUserActivity(
          auth.user.id,
          'columns.update',
          `Updated column: ${updatedColumn?.name}`,
          { changes: validationResult.data, columnId: id }
        )

        const endTime = Date.now()
        console.log(`=== UPDATE COLUMN API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          column: {
            ...updatedColumn?.toJSON(),
            id: updatedColumn?._id,
          },
        })
      } catch (error) {
        console.error('=== UPDATE COLUMN API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Update column error:', error)
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

// DELETE /api/columns/[id] - Delete column
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()
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

        const { id } = await params
        const columnData = await checkColumnAccess(id, auth.user.id)

        if (!columnData) {
          console.log('Column not found or access denied')
          return NextResponse.json(
            { message: 'Column not found or access denied' },
            { status: 404 }
          )
        }

        // Check if column has tasks
        const taskCount = await Task.countDocuments({
          projectId: columnData.column.projectId,
          status: columnData.column.slug,
        })

        if (taskCount > 0) {
          return NextResponse.json(
            { message: 'Cannot delete column that contains tasks. Move tasks first.' },
            { status: 400 }
          )
        }

        // Prevent deleting if it's the only column
        const columnCount = await Column.countDocuments({
          projectId: columnData.column.projectId,
        })

        if (columnCount <= 1) {
          return NextResponse.json(
            { message: 'Cannot delete the last column in a project.' },
            { status: 400 }
          )
        }

        console.log('Deleting column...')
        await Column.findByIdAndDelete(id)

        await logUserActivity(
          auth.user.id,
          'columns.delete',
          `Deleted column: ${columnData.column.name}`,
          { columnId: id }
        )

        const endTime = Date.now()
        console.log(`=== DELETE COLUMN API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('=== DELETE COLUMN API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Delete column error:', error)
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