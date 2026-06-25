import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { ProjectDocument, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z
    .union([z.string(), z.array(z.any()), z.record(z.any())])
    .transform(val => {
      if (Array.isArray(val)) {
        return val
          .map(block => {
            if (typeof block === 'string') return block
            if (block.type === 'paragraph') {
              return `<p>${block.content || ''}</p>`
            }
            if (block.type === 'heading') {
              return `<h${block.level || 2}>${block.content || ''}</h${block.level || 2}>`
            }
            if (block.type === 'list') {
              return `<ul><li>${block.content || ''}</li></ul>`
            }
            return block.content || ''
          })
          .join('')
      }
      if (typeof val === 'object') {
        return JSON.stringify(val)
      }
      return val || ''
    }),
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
        const type = url.searchParams.get('type')
        const search = url.searchParams.get('search')

        if (!projectId) {
          return NextResponse.json(
            { message: 'Project ID is required' },
            { status: 400 }
          )
        }

        const project = await checkProjectDocumentAccess(
          projectId,
          auth.user.id
        )
        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          project.workspaceId.toString(),
          'documents.view'
        )
        if (permError) return permError

        const query: any = { projectId }
        if (type) query.type = type
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } },
          ]
        }

        query.$or = [
          { createdBy: auth.user.id },
          { visibility: 'project' },
          { visibility: 'workspace' },
        ]

        const documents = await ProjectDocument.find(query)
          .populate('createdBy', 'fullName email')
          .populate('lastEditedBy', 'fullName email')
          .sort({ updatedAt: -1 })
          .lean()

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

        return NextResponse.json({ documents: formattedDocuments })
      } catch (error) {
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

        if (body.tags) {
          if (typeof body.tags === 'string') {
            try {
              const parsed = JSON.parse(body.tags)
              if (Array.isArray(parsed)) {
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
            body.tags = body.tags.map((tag: any) =>
              typeof tag === 'string' ? tag : tag.text || String(tag)
            )
          }
        }

        const validationResult = createDocumentSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const project = await checkProjectDocumentAccess(
          validationResult.data.projectId,
          auth.user.id
        )
        if (!project) {
          return NextResponse.json(
            { message: 'Project not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          project.workspaceId.toString(),
          'documents.create'
        )
        if (permError) return permError

        const document = new ProjectDocument({
          ...validationResult.data,
          workspaceId: project.workspaceId,
          createdBy: auth.user.id,
          lastEditedBy: auth.user.id,
          lastEditedAt: new Date(),
        })

        await document.save()

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

        return NextResponse.json({
          document: {
            ...document.toJSON(),
          },
        })
      } catch (error) {
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
