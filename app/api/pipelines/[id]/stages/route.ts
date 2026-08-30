import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Pipeline, PipelineStage } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createStageSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  probability: z.number().min(0).max(100).optional(),
  isWonStage: z.boolean().optional(),
  isLostStage: z.boolean().optional(),
})

export const POST = withSecurityLogging(
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

        const { id: pipelineId } = await params
        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = createStageSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const pipeline = await Pipeline.findOne({
          _id: pipelineId,
          workspaceId,
          isActive: true,
        })
        if (!pipeline) {
          return NextResponse.json(
            { message: 'Pipeline not found' },
            { status: 404 }
          )
        }

        const maxOrder = await PipelineStage.findOne({ pipelineId })
          .sort({ order: -1 })
          .select('order')
          .lean()

        const stage = await PipelineStage.create({
          ...validationResult.data,
          workspaceId,
          pipelineId,
          order: maxOrder ? (maxOrder as any).order + 1 : 0,
          createdBy: auth.user.id,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Stage created successfully',
            stage: stage.toJSON(),
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            {
              message: 'A stage with this name already exists in this pipeline',
            },
            { status: 400 }
          )
        }
        log.error('Create stage error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
