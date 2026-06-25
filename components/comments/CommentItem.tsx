'use client'

import { useState } from 'react'
import { Pencil, Trash2, History, MoreHorizontal, Reply } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  type Comment,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from '@/lib/api/commentsApi'
import { CommentInput } from './CommentInput'
import { CommentEditHistoryDialog } from './CommentEditHistoryDialog'

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  isReply?: boolean
}

export function CommentItem({
  comment,
  currentUserId,
  isReply = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [updateComment] = useUpdateCommentMutation()
  const [deleteComment] = useDeleteCommentMutation()

  const isOwner = comment.createdBy?.id === currentUserId

  const handleUpdate = async (content: string) => {
    try {
      await updateComment({ id: comment.id, content }).unwrap()
      setIsEditing(false)
      toast.success('Comment updated')
    } catch {
      toast.error('Failed to update comment')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteComment({
        id: comment.id,
        entityType: comment.entityType,
        entityId: comment.entityId,
      }).unwrap()
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (comment.isDeleted) {
    return (
      <div className={`flex gap-3 ${isReply ? 'ml-10' : ''}`}>
        <div className="flex-1 rounded-md bg-muted/30 px-3 py-2">
          <p className="text-sm italic text-muted-foreground">
            This comment has been deleted
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`group flex gap-3 ${isReply ? 'ml-10' : ''}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.createdBy?.avatarUrl} />
          <AvatarFallback className="text-xs">
            {comment.createdBy?.fullName
              ?.split(' ')
              .map(n => n[0])
              .join('') || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {comment.createdBy?.fullName || 'Unknown User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                (edited)
              </button>
            )}
          </div>

          {isEditing ? (
            <CommentInput
              onSubmit={handleUpdate}
              initialValue={comment.content}
              submitLabel="Save"
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm">{comment.content}</div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    {comment.isEdited && (
                      <DropdownMenuItem onClick={() => setShowHistory(true)}>
                        <History className="mr-2 h-3.5 w-3.5" />
                        View History
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!isOwner && comment.isEdited && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit History Dialog */}
      <CommentEditHistoryDialog
        commentId={comment.id}
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This comment will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
