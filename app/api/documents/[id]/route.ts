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

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z
    .union([z.string(), z.array(z.any()), z.record(z.any())])
    .transform(val => {
      if (val === undefined) return undefined
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
    })
    .optional(),
  type: z.enum(['document', 'template', 'note']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['private', 'project', 'workspace']).optional(),
  tags: z.array(z.string()).optional(),
  customProperties: z.record(z.any()).optional(),
})

async function checkDocumentAccess(documentId: string, userId: string) {
  const document = await ProjectDocument.findById(documentId)
  if (!document) return null

  if (document.createdBy === userId) return document

  const project = await Project.findById(document.projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId: document.projectId,
    userId,
    status: 'active',
  })

  if (document.visibility === 'private' && document.createdBy !== userId) {
    return null
  }

  if (document.visibility === 'project' && !projectMember) {
    return null
  }

  if (
    document.visibility === 'workspace' &&
    project.workspaceId !== projectMember?.workspaceId
  ) {
    return null
  }

  return document
}

export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id: documentId } = await params

        const document = await checkDocumentAccess(documentId, auth.user.id)
        if (!document) {
          return NextResponse.json(
            { message: 'Document not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          document.workspaceId?.toString() || '',
          'documents.view'
        )
        if (permError) return permError

        await document.populate('createdBy', 'fullName email avatarUrl')
        await document.populate('lastEditedBy', 'fullName email avatarUrl')

        const documentResponse = {
          ...document.toJSON(),
        }

        await logUserActivity(
          auth.user.id,
          'documents.view',
          `Viewed document: ${document.title}`,
          { entityType: 'Document', documentId }
        )

        return NextResponse.json({
          document: documentResponse,
        })
      } catch (error) {
        log.error('Get document error:', error)
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

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id: documentId } = await params
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

        const validationResult = updateDocumentSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const document = await checkDocumentAccess(documentId, auth.user.id)
        if (!document) {
          return NextResponse.json(
            { message: 'Document not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          document.workspaceId?.toString() || '',
          'documents.edit'
        )
        if (permError) return permError

        if (document.createdBy !== auth.user.id) {
          const projectMember = await ProjectMember.findOne({
            projectId: document.projectId,
            userId: auth.user.id,
            status: 'active',
          })

          if (!projectMember) {
            return NextResponse.json(
              { message: 'You do not have permission to edit this document' },
              { status: 403 }
            )
          }
        }

        const updateData = validationResult.data

        const updatedDocument = await ProjectDocument.findByIdAndUpdate(
          documentId,
          {
            ...updateData,
            lastEditedBy: auth.user.id,
            lastEditedAt: new Date(),
          },
          { new: true }
        )

        if (!updatedDocument) {
          return NextResponse.json(
            { message: 'Document not found' },
            { status: 404 }
          )
        }

        await updatedDocument.populate('createdBy', 'fullName email avatarUrl')
        await updatedDocument.populate(
          'lastEditedBy',
          'fullName email avatarUrl'
        )

        await logUserActivity(
          auth.user.id,
          'documents.update',
          `Updated document: ${updatedDocument.title}`,
          {
            entityType: 'Document',
            documentId,
            updatedFields: Object.keys(validationResult.data),
          }
        )

        return NextResponse.json({
          document: {
            ...updatedDocument.toJSON(),
          },
        })
      } catch (error) {
        log.error('Update document error:', error)
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

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id: documentId } = await params

        const document = await checkDocumentAccess(documentId, auth.user.id)
        if (!document) {
          return NextResponse.json(
            { message: 'Document not found or access denied' },
            { status: 404 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          document.workspaceId?.toString() || '',
          'documents.delete'
        )
        if (permError) return permError

        if (document.createdBy !== auth.user.id) {
          return NextResponse.json(
            { message: 'You do not have permission to delete this document' },
            { status: 403 }
          )
        }

        await ProjectDocument.findByIdAndDelete(documentId)

        await logUserActivity(
          auth.user.id,
          'documents.delete',
          `Deleted document: ${document.title}`,
          { entityType: 'Document', documentId }
        )

        return NextResponse.json({ success: true })
      } catch (error) {
        log.error('Delete document error:', error)
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
