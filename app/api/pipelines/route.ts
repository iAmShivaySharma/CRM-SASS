import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  Pipeline,
  PipelineStage,
  WorkspaceMember,
  Activity,
} from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  currency: z.string().max(5).optional(),
  isDefault: z.boolean().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        probability: z.number().min(0).max(100).optional(),
        isWonStage: z.boolean().optional(),
        isLostStage: z.boolean().optional(),
      })
    )
    .optional(),
})

const DEFAULT_STAGES = [
  { name: 'Qualified', color: '#6366f1', probability: 10 },
  { name: 'Proposal Sent', color: '#8b5cf6', probability: 30 },
  { name: 'Negotiation', color: '#f59e0b', probability: 60 },
  { name: 'Won', color: '#10b981', probability: 100, isWonStage: true },
  { name: 'Lost', color: '#ef4444', probability: 0, isLostStage: true },
]

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

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.view'
        )
        if (permError) return permError

        const pipelines = await Pipeline.find({
          workspaceId,
          isActive: true,
        })
          .sort({ isDefault: -1, createdAt: 1 })
          .lean()

        const pipelineIds = pipelines.map((p: any) => p._id.toString())
        const stages = await PipelineStage.find({
          pipelineId: { $in: pipelineIds },
          isActive: true,
        })
          .sort({ order: 1 })
          .lean()

        const stagesByPipeline: Record<string, any[]> = {}
        stages.forEach((stage: any) => {
          const pid = stage.pipelineId.toString()
          if (!stagesByPipeline[pid]) stagesByPipeline[pid] = []
          stagesByPipeline[pid].push({
            ...stage,
            id: stage._id,
          })
        })

        return NextResponse.json({
          success: true,
          pipelines: pipelines.map((p: any) => ({
            ...p,
            id: p._id,
            stages: stagesByPipeline[p._id.toString()] || [],
          })),
        })
      } catch (error) {
        log.error('Get pipelines error:', error)
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
        const validationResult = createPipelineSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'leads.create'
        )
        if (permError) return permError

        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })
        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const { stages: stageData, ...pipelineData } = validationResult.data

        if (pipelineData.isDefault) {
          await Pipeline.updateMany(
            { workspaceId, isDefault: true },
            { isDefault: false }
          )
        }

        const existingCount = await Pipeline.countDocuments({ workspaceId })
        const pipeline = await Pipeline.create({
          ...pipelineData,
          workspaceId,
          isDefault: pipelineData.isDefault || existingCount === 0,
          createdBy: auth.user.id,
        })

        const stagesToCreate = stageData || DEFAULT_STAGES
        const stagesDocs = stagesToCreate.map((stage, index) => ({
          workspaceId,
          pipelineId: pipeline._id.toString(),
          name: stage.name,
          color: stage.color || '#6366f1',
          order: index,
          probability: stage.probability ?? 0,
          isWonStage: stage.isWonStage || false,
          isLostStage: stage.isLostStage || false,
          createdBy: auth.user.id,
        }))

        const createdStages = await PipelineStage.insertMany(stagesDocs)

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'created',
          entityType: 'pipeline',
          entityId: pipeline._id.toString(),
          description: `Created pipeline "${pipelineData.name}"`,
        })

        logBusinessEvent('pipeline_created', auth.user.id, workspaceId, {
          pipelineId: pipeline._id,
          name: pipelineData.name,
          stageCount: createdStages.length,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Pipeline created successfully',
            pipeline: {
              ...pipeline.toJSON(),
              stages: createdStages.map((s: any) => s.toJSON()),
            },
          },
          { status: 201 }
        )
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'A pipeline with this name already exists' },
            { status: 400 }
          )
        }
        log.error('Create pipeline error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
