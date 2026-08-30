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

const createDocumentSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
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
  ]),
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
        const category = url.searchParams.get('category')
        const status = url.searchParams.get('status')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const query: any = { workspaceId }
        if (category) query.category = category
        if (status) query.status = status

        const skip = (page - 1) * limit

        const [documents, total] = await Promise.all([
          ComplianceDocument.find(query)
            .sort({ expiryDate: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          ComplianceDocument.countDocuments(query),
        ])

        return NextResponse.json({
          success: true,
          documents: documents.map((d: any) => ({ ...d, id: d._id })),
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
        log.error('Get compliance documents error:', error)
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
        const validation = createDocumentSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const { workspaceId, ...docData } = validation.data

        const document = await ComplianceDocument.create({
          ...docData,
          workspaceId,
          issueDate: docData.issueDate
            ? new Date(docData.issueDate)
            : undefined,
          expiryDate: docData.expiryDate
            ? new Date(docData.expiryDate)
            : undefined,
          createdBy: auth.user.id,
        })

        logUserActivity(
          auth.user.id,
          'compliance_document_created',
          'compliance_document',
          {
            documentId: document._id,
            name: document.name,
            workspaceId,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Document created successfully',
            document: document.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create compliance document error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
