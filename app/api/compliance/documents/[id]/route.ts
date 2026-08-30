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
import { ComplianceDocument } from '@/lib/mongodb/models/ComplianceDocument'

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z
    .enum([
      'license',
      'registration',
      'filing',
      'agreement',
      'certificate',
      'tax_return',
      'audit_report',
      'bank',
      'dsc',
      'other',
    ])
    .optional(),
  documentNumber: z.string().optional(),
  issuedBy: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['valid', 'expiring_soon', 'expired', 'archived']).optional(),
  documentUrl: z.string().optional(),
  retentionYears: z.number().optional(),
  notes: z.string().optional(),
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

        const document = await ComplianceDocument.findOne({
          _id: id,
          workspaceId,
        }).lean()
        if (!document) {
          return NextResponse.json(
            { message: 'Document not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          document: { ...(document as any), id: (document as any)._id },
        })
      } catch (error) {
        log.error('Get compliance document error:', error)
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
        const validation = updateDocumentSchema.safeParse(rest)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const updateData: any = { ...validation.data }
        if (updateData.issueDate) {
          updateData.issueDate = new Date(updateData.issueDate)
        }
        if (updateData.expiryDate) {
          updateData.expiryDate = new Date(updateData.expiryDate)
        }

        const document = await ComplianceDocument.findOneAndUpdate(
          { _id: id, workspaceId },
          { $set: updateData },
          { new: true }
        ).lean()

        if (!document) {
          return NextResponse.json(
            { message: 'Document not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'compliance_document_updated',
          'compliance_document',
          {
            documentId: id,
            workspaceId,
          }
        )

        return NextResponse.json({
          success: true,
          document: { ...(document as any), id: (document as any)._id },
        })
      } catch (error) {
        log.error('Update compliance document error:', error)
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

        const document = await ComplianceDocument.findOneAndDelete({
          _id: id,
          workspaceId,
        })
        if (!document) {
          return NextResponse.json(
            { message: 'Document not found' },
            { status: 404 }
          )
        }

        logUserActivity(
          auth.user.id,
          'compliance_document_deleted',
          'compliance_document',
          {
            documentId: id,
            workspaceId,
          }
        )

        return NextResponse.json({
          success: true,
          message: 'Document deleted successfully',
        })
      } catch (error) {
        log.error('Delete compliance document error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
