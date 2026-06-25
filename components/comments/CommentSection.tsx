'use client'

import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import {
  useGetCommentsQuery,
  useCreateCommentMutation,
} from '@/lib/api/commentsApi'
import { useAppSelector } from '@/lib/hooks'
import { CommentInput } from './CommentInput'
import { CommentItem } from './CommentItem'

interface CommentSectionProps {
  entityType: 'task' | 'project' | 'document'
  entityId: string
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { user } = useAppSelector(state => state.auth)

  const { data, isLoading } = useGetCommentsQuery(
    { entityType, entityId },
    { skip: !entityId }
  )

  const [createComment] = useCreateCommentMutation()

  const comments = data?.comments || []

  // Separate top-level comments and replies
  const topLevelComments = comments.filter(c => !c.parentId)
  const repliesByParent = comments.reduce(
    (acc, c) => {
      if (c.parentId) {
        if (!acc[c.parentId]) acc[c.parentId] = []
        acc[c.parentId].push(c)
      }
      return acc
    },
    {} as Record<string, typeof comments>
  )

  const handleCreate = async (content: string) => {
    try {
      await createComment({ content, entityType, entityId }).unwrap()
    } catch {
      toast.error('Failed to add comment')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-sm font-semibold">
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </h3>
      </div>

      <Separator />

      {/* Comment list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : topLevelComments.length > 0 ? (
        <div className="space-y-4">
          {topLevelComments.map(comment => (
            <div key={comment.id}>
              <CommentItem comment={comment} currentUserId={user?.id || ''} />
              {/* Replies */}
              {repliesByParent[comment.id]?.map(reply => (
                <div key={reply.id} className="mt-2">
                  <CommentItem
                    comment={reply}
                    currentUserId={user?.id || ''}
                    isReply
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No comments yet. Be the first to comment.
        </p>
      )}

      <Separator />

      {/* New comment input */}
      <CommentInput onSubmit={handleCreate} />
    </div>
  )
}
