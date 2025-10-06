import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { ProjectDocument, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging, logUserActivity } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.union([z.array(z.any()), z.record(z.any())]).optional(),
  type: z.enum(['document', 'template', 'note']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['private', 'project', 'workspace']).optional(),
  tags: z.array(z.string()).optional(),
  customProperties: z.record(z.any()).optional(),
})

async function checkDocumentAccess(documentId: string, userId: string) {
  const document = await ProjectDocument.findById(documentId)
  if (!document) return null

  // Check if user created the document
  if (document.createdBy === userId) return document

  // Check project access
  const project = await Project.findById(document.projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId: document.projectId,
    userId,
    status: 'active',
  })

  // Check visibility permissions
  if (document.visibility === 'private' && document.createdBy !== userId) {
    return null
  }

  if (document.visibility === 'project' && !projectMember) {
    return null
  }

  if (document.visibility === 'workspace' && project.workspaceId !== projectMember?.workspaceId) {
    return null
  }

  return document
}

// GET /api/documents/[id] - Get a specific document
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()
      console.log('=== GET DOCUMENT API DEBUG START ===')

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

        const { id: documentId } = await params
        console.log('Fetching document:', documentId)

        const document = await checkDocumentAccess(documentId, auth.user.id)
        if (!document) {
          console.log('Document not found or access denied')
          return NextResponse.json(
            { message: 'Document not found or access denied' },
            { status: 404 }
          )
        }

        // Populate related data
        await document.populate('createdBy', 'fullName email avatarUrl')
        await document.populate('lastEditedBy', 'fullName email avatarUrl')

        console.log('Document retrieved successfully')
        console.log('Document content type:', typeof document.content)
        console.log('Document content value:', document.content)
        console.log('Document tags:', document.tags)

        const documentResponse = {
          ...document.toJSON(),
        }

        console.log('Sending document response:', JSON.stringify(documentResponse, null, 2))

        await logUserActivity(
          auth.user.id,
          'documents.view',
          `Viewed document: ${document.title}`,
          { entityType: 'Document', documentId }
        )

        const endTime = Date.now()
        console.log(`=== GET DOCUMENT API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          document: documentResponse,
        })
      } catch (error) {
        console.error('=== GET DOCUMENT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// PUT /api/documents/[id] - Update a document
export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()
      console.log('=== UPDATE DOCUMENT API DEBUG START ===')

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

        const { id: documentId } = await params
        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))
        console.log('Tags raw value:', body.tags, typeof body.tags)

        // Pre-process tags - convert to string array only
        if (body.tags) {
          console.log('Processing tags:', body.tags, typeof body.tags)

          if (typeof body.tags === 'string') {
            try {
              const parsed = JSON.parse(body.tags)
              if (Array.isArray(parsed)) {
                // Extract text from objects, keep strings as-is
                body.tags = parsed.map(tag =>
                  typeof tag === 'string' ? tag : (tag.text || String(tag))
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
              typeof tag === 'string' ? tag : (tag.text || String(tag))
            )
          }

          console.log('Processed tags to string array:', body.tags)
        }

        console.log('Body after preprocessing:', JSON.stringify(body, null, 2))
        const validationResult = updateDocumentSchema.safeParse(body)

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

        console.log('Checking document access...')
        const document = await checkDocumentAccess(documentId, auth.user.id)
        if (!document) {
          console.log('Document not found or access denied')
          return NextResponse.json(
            { message: 'Document not found or access denied' },
            { status: 404 }
          )
        }

        // Check if user can edit (owner or project member with edit permissions)
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

        console.log('Updating document...')
        console.log('Validation result data:', JSON.stringify(validationResult.data, null, 2))

        const updateData = validationResult.data
        console.log('Final update data:', JSON.stringify(updateData, null, 2))

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

        // Populate for response
        await updatedDocument.populate('createdBy', 'fullName email avatarUrl')
        await updatedDocument.populate('lastEditedBy', 'fullName email avatarUrl')

        console.log('Document updated successfully')

        await logUserActivity(
          auth.user.id,
          'documents.update',
          `Updated document: ${updatedDocument.title}`,
          { entityType: 'Document', documentId, updatedFields: Object.keys(validationResult.data) }
        )

        const endTime = Date.now()
        console.log(`=== UPDATE DOCUMENT API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({
          document: {
            ...updatedDocument.toJSON(),
          },
        })
      } catch (error) {
        console.error('=== UPDATE DOCUMENT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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

// DELETE /api/documents/[id] - Delete a document
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()
      console.log('=== DELETE DOCUMENT API DEBUG START ===')

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

        const { id: documentId } = await params
        console.log('Deleting document:', documentId)

        const document = await checkDocumentAccess(documentId, auth.user.id)
        if (!document) {
          console.log('Document not found or access denied')
          return NextResponse.json(
            { message: 'Document not found or access denied' },
            { status: 404 }
          )
        }

        // Only owner can delete
        if (document.createdBy !== auth.user.id) {
          return NextResponse.json(
            { message: 'You do not have permission to delete this document' },
            { status: 403 }
          )
        }

        await ProjectDocument.findByIdAndDelete(documentId)
        console.log('Document deleted successfully')

        await logUserActivity(
          auth.user.id,
          'documents.delete',
          `Deleted document: ${document.title}`,
          { entityType: 'Document', documentId }
        )

        const endTime = Date.now()
        console.log(`=== DELETE DOCUMENT API SUCCESS (${endTime - startTime}ms) ===`)

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('=== DELETE DOCUMENT API ERROR ===')
        console.error('Error details:', error)
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
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