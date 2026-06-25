'use client'

import { Clock, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useGetCommentHistoryQuery } from '@/lib/api/commentsApi'

interface CommentEditHistoryDialogProps {
  commentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommentEditHistoryDialog({
  commentId,
  open,
  onOpenChange,
}: CommentEditHistoryDialogProps) {
  const { data, isLoading } = useGetCommentHistoryQuery(
    { commentId },
    { skip: !open }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit History</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.totalEdits} edit${data.totalEdits !== 1 ? 's' : ''} made to this comment`
              : 'Loading history...'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading && (
            <div className="space-y-3 p-2">
              {[1, 2].map(i => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          )}

          {data && (
            <div className="space-y-4 p-1">
              {[...data.versions].reverse().map((version, index) => (
                <div key={version.version}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={version.editedBy?.avatarUrl} />
                          <AvatarFallback className="text-[10px]">
                            {version.editedBy?.fullName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('') || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {version.editedBy?.fullName || 'Unknown'}
                        </span>
                        <Badge
                          variant={
                            version.label === 'Current'
                              ? 'default'
                              : 'secondary'
                          }
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {version.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(version.editedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                      {version.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
