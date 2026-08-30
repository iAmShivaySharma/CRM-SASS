'use client'

import { useState } from 'react'
import {
  IndianRupee,
  Calendar,
  User,
  Building2,
  Trophy,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  Edit3,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useGetDealQuery,
  useWonDealMutation,
  useLostDealMutation,
  useDeleteDealMutation,
  type Deal,
  type PipelineStage,
} from '@/lib/api/dealsApi'

interface DealDetailsSheetProps {
  deal: Deal
  workspaceId: string
  stages: PipelineStage[]
  open: boolean
  onClose: () => void
}

const activityIcons: Record<string, any> = {
  created: Clock,
  stage_changed: ArrowRight,
  won: Trophy,
  lost: XCircle,
  updated: Edit3,
  value_changed: IndianRupee,
  assigned: User,
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  abandoned: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export function DealDetailsSheet({
  deal,
  workspaceId,
  stages,
  open,
  onClose,
}: DealDetailsSheetProps) {
  const [showWonDialog, setShowWonDialog] = useState(false)
  const [showLostDialog, setShowLostDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [wonNote, setWonNote] = useState('')
  const [lostReason, setLostReason] = useState('')

  const { data: dealData } = useGetDealQuery(
    { id: deal.id, workspaceId },
    { skip: !open }
  )

  const [wonDeal, { isLoading: wonLoading }] = useWonDealMutation()
  const [lostDeal, { isLoading: lostLoading }] = useLostDealMutation()
  const [deleteDeal, { isLoading: deleteLoading }] = useDeleteDealMutation()

  const activities = dealData?.activities || []

  const contactName =
    typeof deal.contactId === 'object' ? deal.contactId?.name : null
  const contactCompany =
    typeof deal.contactId === 'object' ? deal.contactId?.company : null
  const contactEmail =
    typeof deal.contactId === 'object' ? deal.contactId?.email : null
  const assigneeName =
    typeof deal.assignedTo === 'object' ? deal.assignedTo?.fullName : null
  const stageName =
    typeof deal.stageId === 'object'
      ? deal.stageId?.name
      : stages.find(s => s.id === deal.stageId)?.name
  const stageColor =
    typeof deal.stageId === 'object'
      ? deal.stageId?.color
      : stages.find(s => s.id === deal.stageId)?.color

  const handleWon = async () => {
    try {
      await wonDeal({
        id: deal.id,
        workspaceId,
        wonNote: wonNote || undefined,
      }).unwrap()
      toast.success('Deal marked as won!')
      setShowWonDialog(false)
      onClose()
    } catch {
      toast.error('Failed to mark deal as won')
    }
  }

  const handleLost = async () => {
    try {
      await lostDeal({
        id: deal.id,
        workspaceId,
        lostReason: lostReason || undefined,
      }).unwrap()
      toast.success('Deal marked as lost')
      setShowLostDialog(false)
      onClose()
    } catch {
      toast.error('Failed to mark deal as lost')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteDeal({ id: deal.id, workspaceId }).unwrap()
      toast.success('Deal deleted')
      setShowDeleteDialog(false)
      onClose()
    } catch {
      toast.error('Failed to delete deal')
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={() => onClose()}>
        <SheetContent className="w-full p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b p-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-lg">{deal.title}</SheetTitle>
                <div className="mt-1 flex items-center gap-2">
                  {stageName && (
                    <Badge variant="outline" className="text-xs">
                      <div
                        className="mr-1 h-2 w-2 rounded-full"
                        style={{ backgroundColor: stageColor || '#6366f1' }}
                      />
                      {stageName}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className={statusColors[deal.status]}
                  >
                    {deal.status}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-4 p-4">
              {/* Value */}
              <div className="flex items-center gap-2 text-2xl font-bold">
                <IndianRupee className="h-6 w-6" />
                {deal.value.toLocaleString('en-IN')}
              </div>

              {/* Key Details */}
              <div className="grid grid-cols-2 gap-3">
                {contactName && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-3.5 w-3.5" />
                      {contactName}
                    </div>
                    {contactEmail && (
                      <p className="text-xs text-muted-foreground">
                        {contactEmail}
                      </p>
                    )}
                  </div>
                )}
                {contactCompany && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Company</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="h-3.5 w-3.5" />
                      {contactCompany}
                    </div>
                  </div>
                )}
                {assigneeName && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-3.5 w-3.5" />
                      {assigneeName}
                    </div>
                  </div>
                )}
                {deal.expectedCloseDate && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Expected Close
                    </p>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(deal.expectedCloseDate).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Probability</p>
                  <p className="text-sm font-medium">{deal.probability}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {deal.priority}
                  </Badge>
                </div>
              </div>

              {deal.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap text-sm">{deal.notes}</p>
                  </div>
                </>
              )}

              {/* Actions */}
              {deal.status === 'open' && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => setShowWonDialog(true)}
                    >
                      <Trophy className="mr-1 h-4 w-4" />
                      Won
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setShowLostDialog(true)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Lost
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* Activity Timeline */}
              <Separator />
              <div>
                <h3 className="mb-3 text-sm font-semibold">Activity</h3>
                <div className="space-y-3">
                  {activities.map((activity: any) => {
                    const Icon = activityIcons[activity.type] || Clock
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded bg-muted p-1">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeof activity.performedBy === 'object'
                              ? activity.performedBy.fullName
                              : ''}{' '}
                            ·{' '}
                            {new Date(activity.createdAt).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {activities.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No activity yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Won Dialog */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark Deal as Won</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Congratulations! Add a note about this win.
            </p>
            <div className="space-y-2">
              <Label>Win Note (optional)</Label>
              <Textarea
                placeholder="e.g., Customer signed 1-year AMC contract"
                value={wonNote}
                onChange={e => setWonNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWonDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleWon}
                disabled={wonLoading}
              >
                {wonLoading && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Mark as Won
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lost Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark Deal as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              What was the reason for losing this deal?
            </p>
            <div className="space-y-2">
              <Label>Lost Reason (optional)</Label>
              <Textarea
                placeholder="e.g., Customer went with competitor, Price too high"
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLostDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLost}
                disabled={lostLoading}
              >
                {lostLoading && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Mark as Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deal.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
