'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Download,
  Eye,
  MoreVertical,
  UserCheck,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetExecutionsQuery } from '@/lib/api/enginesApi'
import { ExecutionOutput } from '@/components/engines/ExecutionOutput'

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle,
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    iconColor: 'text-green-600',
  },
  running: {
    icon: Clock,
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    iconColor: 'text-blue-600',
    animate: true,
  },
  waiting_for_input: {
    icon: UserCheck,
    className:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    iconColor: 'text-orange-600',
  },
  failed: {
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    iconColor: 'text-red-600',
  },
  timeout: {
    icon: Timer,
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    iconColor: 'text-gray-600',
  },
  pending: {
    icon: AlertCircle,
    className:
      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    iconColor: 'text-gray-500',
  },
} as const

type ExecutionStatus = keyof typeof STATUS_CONFIG

export default function ExecutionsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const pageSize = 20

  const {
    data: executionsResponse,
    isLoading,
    isFetching,
  } = useGetExecutionsQuery(
    {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: pageSize,
      offset: page * pageSize,
    },
    { pollingInterval: 10000 }
  )

  const executions =
    (executionsResponse as any)?.data?.data ||
    (executionsResponse as any)?.data ||
    []
  const pagination =
    (executionsResponse as any)?.data?.pagination ||
    (executionsResponse as any)?.pagination

  const filteredExecutions = searchTerm
    ? executions.filter(
        (e: any) =>
          e._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.n8nWorkflowId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.n8nExecutionId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : executions

  const completedCount = executions.filter(
    (e: any) => e.status === 'completed'
  ).length
  const totalCost = executions.reduce(
    (sum: number, e: any) => sum + (e.apiKeyUsed?.cost || 0),
    0
  )
  const completedExecutions = executions.filter(
    (e: any) => e.status === 'completed' && e.executionTimeMs
  )
  const avgTime =
    completedExecutions.length > 0
      ? completedExecutions.reduce(
          (sum: number, e: any) => sum + e.executionTimeMs,
          0
        ) / completedExecutions.length
      : 0
  const successRate =
    executions.length > 0
      ? Math.round((completedCount / executions.length) * 100)
      : 0

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderStatusBadge = (status: string) => {
    const config =
      STATUS_CONFIG[status as ExecutionStatus] || STATUS_CONFIG.pending
    const Icon = config.icon
    const label = status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())

    return (
      <div className="flex items-center space-x-2">
        <Icon
          className={`h-4 w-4 ${config.iconColor} ${'animate' in config && config.animate ? 'animate-pulse' : ''}`}
        />
        <Badge variant="secondary" className={config.className}>
          {label}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Execution History
          </h1>
          <p className="text-muted-foreground">
            Track your workflow executions, costs, and results
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => router.push('/engines')}>
            <Play className="mr-2 h-4 w-4" />
            Run Workflow
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm font-medium">
              <Play className="h-4 w-4 text-primary" />
              <span>Total Executions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {pagination?.total ?? executions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedCount} completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>Total Cost</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${totalCost.toFixed(3)}
                </div>
                <p className="text-xs text-muted-foreground">This page</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Avg. Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {avgTime > 0 ? formatDuration(avgTime) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Per execution</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{successRate}%</div>
                <p className="text-xs text-muted-foreground">Success rate</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Input
            placeholder="Search by execution ID or workflow ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={v => {
            setStatusFilter(v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="waiting_for_input">Waiting for Input</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="timeout">Timed Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading...'
              : `Showing ${filteredExecutions.length} of ${pagination?.total ?? executions.length} executions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution: any) => (
                  <>
                    <TableRow
                      key={execution._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === execution._id ? null : execution._id
                        )
                      }
                    >
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {execution.n8nWorkflowId || execution._id.slice(-8)}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {execution._id.slice(-8)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {renderStatusBadge(execution.status)}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {formatTimestamp(
                            execution.startedAt || execution.createdAt
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {execution.status === 'running' ||
                          execution.status === 'waiting_for_input'
                            ? 'In progress...'
                            : execution.executionTimeMs
                              ? formatDuration(execution.executionTimeMs)
                              : '—'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm font-medium">
                          {!execution.apiKeyUsed?.cost ||
                          execution.apiKeyUsed.cost === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            `$${execution.apiKeyUsed.cost.toFixed(3)}`
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={e => {
                              e.stopPropagation()
                              setExpandedRow(
                                expandedRow === execution._id
                                  ? null
                                  : execution._id
                              )
                            }}
                          >
                            {expandedRow === execution._id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={e => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/engines/executions/${execution._id}`
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Full Details
                              </DropdownMenuItem>
                              {execution.status === 'waiting_for_input' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/engines/executions/${execution._id}/input`
                                    )
                                  }
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Provide Input
                                </DropdownMenuItem>
                              )}
                              {execution.status === 'completed' &&
                                execution.outputData && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const blob = new Blob(
                                        [
                                          JSON.stringify(
                                            execution.outputData,
                                            null,
                                            2
                                          ),
                                        ],
                                        { type: 'application/json' }
                                      )
                                      const url = URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `execution-${execution._id.slice(-8)}.json`
                                      a.click()
                                      URL.revokeObjectURL(url)
                                    }}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Results
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedRow === execution._id && (
                      <TableRow key={`${execution._id}-expanded`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            {execution.inputData &&
                              Object.keys(execution.inputData).length > 0 && (
                                <div>
                                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                                    Input
                                  </h4>
                                  <div className="rounded border bg-background p-2 text-xs">
                                    <pre className="overflow-auto whitespace-pre-wrap">
                                      {JSON.stringify(
                                        execution.inputData,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>
                              )}

                            {execution.status === 'completed' &&
                              execution.outputData && (
                                <div>
                                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                                    Output
                                  </h4>
                                  <ExecutionOutput
                                    data={execution.outputData}
                                    maxHeight="400px"
                                  />
                                </div>
                              )}

                            {execution.status === 'failed' &&
                              execution.errorMessage && (
                                <div>
                                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                                    Error
                                  </h4>
                                  <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-300">
                                    {execution.errorMessage}
                                  </div>
                                </div>
                              )}

                            {execution.status === 'running' && (
                              <div className="flex items-center space-x-2 text-sm text-blue-600">
                                <Clock className="h-4 w-4 animate-pulse" />
                                <span>Workflow is currently executing...</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredExecutions.length === 0 && (
            <div className="py-8 text-center">
              <Play className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                No executions found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by executing a workflow from the catalog'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/engines')}>
                <Play className="mr-2 h-4 w-4" />
                Go to Workflows
              </Button>
            </div>
          )}

          {pagination && pagination.total > pageSize && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(pagination.total / pageSize)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0 || isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasMore || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
