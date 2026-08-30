import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Pipeline, PipelineStage, Deal, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const updatePipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  currency: z.string().max(5).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
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

        const pipeline = await Pipeline.findOne({
          _id: id,
          workspaceId,
        }).lean()

        if (!pipeline) {
          return NextResponse.json(
            { message: 'Pipeline not found' },
            { status: 404 }
          )
        }

        const stages = await PipelineStage.find({
          pipelineId: id,
          isActive: true,
        })
          .sort({ order: 1 })
          .lean()

        const dealCounts = await Deal.aggregate([
          {
            $match: {
              pipelineId: id,
              workspaceId,
              status: 'open',
            },
          },
          {
            $group: {
              _id: '$stageId',
              count: { $sum: 1 },
              totalValue: { $sum: '$value' },
            },
          },
        ])

        const countMap: Record<string, { count: number; totalValue: number }> =
          {}
        dealCounts.forEach((d: any) => {
          countMap[d._id] = { count: d.count, totalValue: d.totalValue }
        })

        return NextResponse.json({
          success: true,
          pipeline: {
            ...(pipeline as any),
            id: (pipeline as any)._id,
            stages: stages.map((s: any) => ({
              ...s,
              id: s._id,
              dealCount: countMap[s._id.toString()]?.count || 0,
              totalValue: countMap[s._id.toString()]?.totalValue || 0,
            })),
          },
        })
      } catch (error) {
        log.error('Get pipeline error:', error)
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
        const { workspaceId } = body

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = updatePipelineSchema.safeParse(body)
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

        const pipeline = await Pipeline.findOne({ _id: id, workspaceId })
        if (!pipeline) {
          return NextResponse.json(
            { message: 'Pipeline not found' },
            { status: 404 }
          )
        }

        if (validationResult.data.isDefault) {
          await Pipeline.updateMany(
            { workspaceId, isDefault: true, _id: { $ne: id } },
            { isDefault: false }
          )
        }

        Object.assign(pipeline, validationResult.data)
        await pipeline.save()

        return NextResponse.json({
          success: true,
          message: 'Pipeline updated successfully',
          pipeline: pipeline.toJSON(),
        })
      } catch (error: any) {
        if (error.code === 11000) {
          return NextResponse.json(
            { message: 'A pipeline with this name already exists' },
            { status: 400 }
          )
        }
        log.error('Update pipeline error:', error)
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

        const pipeline = await Pipeline.findOne({ _id: id, workspaceId })
        if (!pipeline) {
          return NextResponse.json(
            { message: 'Pipeline not found' },
            { status: 404 }
          )
        }

        const openDeals = await Deal.countDocuments({
          pipelineId: id,
          status: 'open',
        })
        if (openDeals > 0) {
          return NextResponse.json(
            {
              message: `Cannot delete pipeline with ${openDeals} open deals. Move or close them first.`,
            },
            { status: 400 }
          )
        }

        await PipelineStage.updateMany({ pipelineId: id }, { isActive: false })
        pipeline.isActive = false
        await pipeline.save()

        await Activity.create({
          workspaceId,
          performedBy: auth.user.id,
          type: 'deleted',
          entityType: 'pipeline',
          entityId: id,
          description: `Deleted pipeline "${pipeline.name}"`,
        })

        return NextResponse.json({
          success: true,
          message: 'Pipeline deleted successfully',
        })
      } catch (error) {
        log.error('Delete pipeline error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    { logBody: false, logHeaders: true }
  )
)
