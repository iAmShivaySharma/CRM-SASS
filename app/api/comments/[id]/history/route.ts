import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Comment } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

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

        const comment = await Comment.findById(id)
          .select('content editHistory isEdited editedAt createdBy createdAt')
          .populate('createdBy', 'fullName email avatarUrl')
          .populate('editHistory.editedBy', 'fullName email avatarUrl')

        if (!comment) {
          return NextResponse.json(
            { message: 'Comment not found' },
            { status: 404 }
          )
        }

        // Build full version timeline: original + each edit + current
        const versions = [
          // Original version
          ...(comment.editHistory.length > 0
            ? [
                {
                  content: comment.editHistory[0].content,
                  editedBy: comment.createdBy,
                  editedAt: comment.createdAt,
                  version: 1,
                  label: 'Original',
                },
              ]
            : []),
          // Intermediate edits (skip first since that's the original content)
          ...comment.editHistory.slice(1).map((entry: any, index: number) => ({
            content: entry.content,
            editedBy: entry.editedBy,
            editedAt: entry.editedAt,
            version: index + 2,
            label: `Edit ${index + 1}`,
          })),
          // Current version
          {
            content: comment.content,
            editedBy:
              comment.editHistory.length > 0
                ? comment.editHistory[comment.editHistory.length - 1].editedBy
                : comment.createdBy,
            editedAt: comment.editedAt || comment.createdAt,
            version:
              comment.editHistory.length > 0
                ? comment.editHistory.length + 1
                : 1,
            label: comment.isEdited ? 'Current' : 'Original',
          },
        ]

        return NextResponse.json({
          commentId: comment._id,
          versions,
          totalEdits: comment.editHistory.length,
        })
      } catch (error) {
        log.error('Get comment history error:', error)
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
    { logBody: false, logHeaders: true }
  )
)
