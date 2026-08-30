import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { PipelineStage, Deal } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  order: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  isWonStage: z.boolean().optional(),
  isLostStage: z.boolean().optional(),
})

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string; stageId: string }> }
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

        const { id: pipelineId, stageId } = await params
        const body = await request.json()
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updateStageSchema.safeParse(body)
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
          'leads.edit'
        )
        if (permError) return permError

        const stage = await PipelineStage.findOne({
          _id: stageId,
          pipelineId,
          workspaceId,
        })

        if (!stage) {
          return NextResponse.json(
            { message: 'Stage not found' },
            { status: 404 }
          )
        }

        Object.assign(stage, validationResult.data)
        await stage.save()

        return NextResponse.json({
          success: true,
          message: 'Stage updated successfully',
          stage: stage.toJSON(),
        })
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            {
              message: 'A stage with this name already exists in this pipeline',
            },
            { status: 400 }
          )
        }
        log.error('Update stage error:', error)
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
      { params }: { params: Promise<{ id: string; stageId: string }> }
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

        const { id: pipelineId, stageId } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.delete'
        )
        if (permError) return permError

        const stage = await PipelineStage.findOne({
          _id: stageId,
          pipelineId,
          workspaceId,
        })

        if (!stage) {
          return NextResponse.json(
            { message: 'Stage not found' },
            { status: 404 }
          )
        }

        const dealsInStage = await Deal.countDocuments({
          stageId,
          status: 'open',
        })
        if (dealsInStage > 0) {
          return NextResponse.json(
            {
              message: `Cannot delete stage with ${dealsInStage} open deals. Move them first.`,
            },
            { status: 400 }
          )
        }

        stage.isActive = false
        await stage.save()

        return NextResponse.json({
          success: true,
          message: 'Stage deleted successfully',
        })
      } catch (error) {
        log.error('Delete stage error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
