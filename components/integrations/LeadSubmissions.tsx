'use client'

import { useState } from 'react'
import { FaFacebook, FaInstagram, FaGoogle, FaLinkedin } from 'react-icons/fa'
import { ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetSubmissionsQuery,
  useProcessSubmissionMutation,
  LeadFormSubmission,
} from '@/lib/api/leadFormApi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  google_ads: FaGoogle,
  linkedin: FaLinkedin,
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'text-[#1877F2]',
  instagram: 'text-[#E4405F]',
  google_ads: 'text-[#4285F4]',
  linkedin: 'text-[#0A66C2]',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processed: 'default',
  failed: 'destructive',
  skipped: 'secondary',
}

function extractField(fieldData: { name: string; value: string }[], ...keys: string[]) {
  for (const key of keys) {
    const field = fieldData.find(
      f => f.name.toLowerCase().includes(key.toLowerCase())
    )
    if (field) return field.value
  }
  return '-'
}

export function LeadSubmissions() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [processingAll, setProcessingAll] = useState(false)

  const { data, isLoading } = useGetSubmissionsQuery(
    {
      workspaceId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      platform: platformFilter !== 'all' ? platformFilter : undefined,
      page,
      limit: 20,
    },
    { skip: !workspaceId }
  )

  const [processSubmission] = useProcessSubmissionMutation()

  const submissions = data?.submissions || []
  const pagination = data?.pagination

  const handleProcess = async (submission: LeadFormSubmission) => {
    setProcessingIds(prev => new Set(prev).add(submission.id))
    try {
      await processSubmission({
        workspaceId,
        submissionId: submission.id,
      }).unwrap()
      toast.success('Submission processed successfully')
    } catch {
      toast.error('Failed to process submission')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(submission.id)
        return next
      })
    }
  }

  const handleProcessAll = async () => {
    const pendingSubmissions = submissions.filter(s => s.status === 'pending')
    if (pendingSubmissions.length === 0) {
      toast.info('No pending submissions to process')
      return
    }

    setProcessingAll(true)
    let successCount = 0
    let failCount = 0

    for (const submission of pendingSubmissions) {
      try {
        await processSubmission({
          workspaceId,
          submissionId: submission.id,
        }).unwrap()
        successCount++
      } catch {
        failCount++
      }
    }

    if (successCount > 0) toast.success(`Processed ${successCount} submissions`)
    if (failCount > 0) toast.error(`Failed to process ${failCount} submissions`)
    setProcessingAll(false)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={v => { setPlatformFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="google_ads">Google Ads</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {pendingCount > 0 && (
          <Button
            size="sm"
            onClick={handleProcessAll}
            disabled={processingAll}
          >
            {processingAll ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            Process All Pending ({pendingCount})
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Platform</TableHead>
              <TableHead>Form Name</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No submissions found
                </TableCell>
              </TableRow>
            ) : (
              submissions.map(submission => {
                const PlatformIcon = PLATFORM_ICONS[submission.platform]
                const platformColor = PLATFORM_COLORS[submission.platform] || ''
                const isProcessing = processingIds.has(submission.id)

                return (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {PlatformIcon && (
                          <PlatformIcon className={`h-4 w-4 ${platformColor}`} />
                        )}
                        <span className="text-xs capitalize text-muted-foreground">
                          {submission.platform.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {submission.formName || '-'}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {extractField(submission.fieldData, 'full_name', 'name', 'first_name')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {extractField(submission.fieldData, 'email')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {extractField(submission.fieldData, 'phone', 'phone_number', 'mobile')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[submission.status] || 'secondary'}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>
                      {submission.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcess(submission)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Process'
                          )}
                        </Button>
                      )}
                      {submission.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcess(submission)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Retry'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
