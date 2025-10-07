import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { ProjectDocument, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.union([z.array(z.any()), z.record(z.any())]).default([]),
  projectId: z.string(),
  folderId: z.string().optional(),
  type: z.enum(['document', 'template', 'note']).default('document'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  visibility: z.enum(['private', 'project', 'workspace']).default('project'),
  tags: z.array(z.string()).optional(),
  customProperties: z.record(z.any()).optional(),
})

async function checkProjectDocumentAccess(projectId: string, userId: string) {
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

// GET /api/documents - Get documents for a project
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== DOCUMENTS API DEBUG START ===')

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
        const type = url.searchParams.get('type')
        const search = url.searchParams.get('search')

        console.log('Request params:', { projectId, type, search })

        if (!projectId) {
          return NextResponse.json(
            { message: 'Project ID is required' },
            { status: 400 }
          )
        }

        console.log('Checking project access...')
        const project = await checkProjectDocumentAccess(
          projectId,
          auth.user.id
        )
        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        console.log('Project access confirmed')

        // Build query
        const query: any = { projectId }
        if (type) query.type = type
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } },
          ]
        }

        // Filter by visibility and user access
        query.$or = [
          { createdBy: auth.user.id }, // Own documents
          { visibility: 'project' }, // Project documents
          { visibility: 'workspace' }, // Workspace documents
        ]

        console.log('Built query:', JSON.stringify(query))

        const documents = await ProjectDocument.find(query)
          .populate('createdBy', 'fullName email')
          .populate('lastEditedBy', 'fullName email')
          .sort({ updatedAt: -1 })
          .lean()

        console.log('Retrieved documents:', documents.length)

        const formattedDocuments = documents.map(doc => ({
          ...doc,
          id: doc._id,
        }))

        await logUserActivity(
          auth.user.id,
          'documents.list',
          `Listed documents for project: ${project.name}`,
          { entityType: 'Document', projectId, filters: { type, search } }
        )

        const endTime = Date.now()
        console.log(`=== DOCUMENTS API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({ documents: formattedDocuments })
      } catch (error) {
        console.error('=== DOCUMENTS API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Get documents error:', error)
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

// POST /api/documents - Create a new document
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()
      console.log('=== CREATE DOCUMENT API DEBUG START ===')

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

        // Pre-process tags - convert to string array only
        if (body.tags) {
          console.log('Processing tags:', body.tags, typeof body.tags)

          if (typeof body.tags === 'string') {
            try {
              const parsed = JSON.parse(body.tags)
              if (Array.isArray(parsed)) {
                // Extract text from objects, keep strings as-is
                body.tags = parsed.map(tag =>
                  typeof tag === 'string' ? tag : tag.text || String(tag)
                )
              } else {
                body.tags = [String(parsed)]
              }
            } catch (e) {
              body.tags = [body.tags]
            }
          } else if (Array.isArray(body.tags)) {
            // Extract text from objects, keep strings as-is
            body.tags = body.tags.map((tag: any) =>
              typeof tag === 'string' ? tag : tag.text || String(tag)
            )
          }

          console.log('Processed tags to string array:', body.tags)
        }

        console.log('Body after preprocessing:', JSON.stringify(body, null, 2))
        const validationResult = createDocumentSchema.safeParse(body)

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
        const project = await checkProjectDocumentAccess(
          validationResult.data.projectId,
          auth.user.id
        )
        if (!project) {
          console.log('Project not found or access denied')
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        console.log('Project access confirmed')

        console.log('Creating new document...')
        const document = new ProjectDocument({
          ...validationResult.data,
          workspaceId: project.workspaceId,
          createdBy: auth.user.id,
          lastEditedBy: auth.user.id,
          lastEditedAt: new Date(),
        })

        await document.save()
        console.log('Document created with ID:', document._id)

        // Populate for response
        await document.populate('createdBy', 'fullName email')

        await logUserActivity(
          auth.user.id,
          'documents.create',
          `Created document: ${document.title}`,
          {
            entityType: 'Document',
            documentId: document._id,
            projectId: validationResult.data.projectId,
          }
        )

        const endTime = Date.now()
        console.log(
          `=== CREATE DOCUMENT API SUCCESS (${endTime - startTime}ms) ===`
        )

        return NextResponse.json({
          document: {
            ...document.toJSON(),
          },
        })
      } catch (error) {
        console.error('=== CREATE DOCUMENT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
        log.error('Create document error:', error)
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
