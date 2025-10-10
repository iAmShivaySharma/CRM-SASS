'use client'

import { useState } from 'react'
import {
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Mail,
  Filter,
  Download,
  Eye,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Mock execution data
const mockExecutions = [
  {
    id: 'exec-001',
    workflowName: 'Content Writer AI',
    status: 'completed',
    startedAt: new Date('2024-01-20T10:30:00'),
    completedAt: new Date('2024-01-20T10:31:15'),
    executionTime: 75,
    apiKeyUsed: {
      type: 'customer',
      name: 'My Primary Key',
      cost: 0
    },
    tokensUsed: 1250,
    inputSummary: 'Topic: "Benefits of Remote Work"',
    outputPreview: 'Remote work has revolutionized the modern workplace...',
    emailSent: true
  },
  {
    id: 'exec-002',
    workflowName: 'Data Analyzer Pro',
    status: 'completed',
    startedAt: new Date('2024-01-20T09:15:00'),
    completedAt: new Date('2024-01-20T09:17:30'),
    executionTime: 150,
    apiKeyUsed: {
      type: 'platform',
      name: 'Platform Key',
      cost: 0.08
    },
    tokensUsed: 890,
    inputSummary: 'CSV: sales_data_q4.csv',
    outputPreview: 'Analysis shows 15% increase in Q4 sales...',
    emailSent: false
  },
  {
    id: 'exec-003',
    workflowName: 'Email Campaign Generator',
    status: 'running',
    startedAt: new Date('2024-01-20T11:45:00'),
    executionTime: 45,
    apiKeyUsed: {
      type: 'customer',
      name: 'My Primary Key',
      cost: 0
    },
    inputSummary: 'Product: SaaS Platform, Audience: SMBs',
    emailSent: false
  },
  {
    id: 'exec-004',
    workflowName: 'Lead Scorer AI',
    status: 'failed',
    startedAt: new Date('2024-01-20T08:30:00'),
    completedAt: new Date('2024-01-20T08:30:45'),
    executionTime: 45,
    apiKeyUsed: {
      type: 'platform',
      name: 'Platform Key',
      cost: 0.06
    },
    error: 'Invalid lead data format',
    inputSummary: 'Lead data: John Doe, company info',
    emailSent: false
  },
  {
    id: 'exec-005',
    workflowName: 'Social Media Scheduler',
    status: 'completed',
    startedAt: new Date('2024-01-19T16:20:00'),
    completedAt: new Date('2024-01-19T16:20:25'),
    executionTime: 25,
    apiKeyUsed: {
      type: 'customer',
      name: 'Secondary Key',
      cost: 0
    },
    tokensUsed: 450,
    inputSummary: 'Platforms: Twitter, LinkedIn',
    outputPreview: 'Posted to 2 platforms successfully',
    emailSent: true
  }
]

export default function ExecutionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedExecution, setSelectedExecution] = useState<any>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredExecutions = mockExecutions.filter(execution => {
    const matchesSearch = execution.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         execution.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalExecutions = mockExecutions.length
  const completedExecutions = mockExecutions.filter(e => e.status === 'completed').length
  const totalCost = mockExecutions.reduce((sum, e) => sum + (e.apiKeyUsed?.cost || 0), 0)
  const avgExecutionTime = mockExecutions
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + e.executionTime, 0) / completedExecutions

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Execution History</h1>
          <p className="text-muted-foreground">
            Track your workflow executions, costs, and results
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Play className="h-4 w-4 text-primary" />
              <span>Total Executions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              {completedExecutions} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>Total Cost</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Avg. Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgExecutionTime)}s</div>
            <p className="text-xs text-muted-foreground">
              Per execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((completedExecutions / totalExecutions) * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Input
            placeholder="Search executions by workflow name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Executions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            Showing {filteredExecutions.length} of {totalExecutions} executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExecutions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{execution.workflowName}</div>
                      <div className="text-sm text-muted-foreground">
                        {execution.inputSummary}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      {getStatusBadge(execution.status)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {formatTimestamp(execution.startedAt)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {execution.status === 'running'
                        ? `${formatDuration(execution.executionTime)}...`
                        : formatDuration(execution.executionTime)
                      }
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={execution.apiKeyUsed.type === 'customer'
                          ? 'text-green-600 border-green-200'
                          : 'text-blue-600 border-blue-200'
                        }
                      >
                        {execution.apiKeyUsed.type === 'customer' ? 'Your Key' : 'Platform'}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm font-medium">
                      {execution.apiKeyUsed.cost === 0
                        ? <span className="text-green-600">Free</span>
                        : `$${execution.apiKeyUsed.cost.toFixed(3)}`
                      }
                    </div>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {execution.status === 'completed' && (
                          <>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download Results
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Email Results
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredExecutions.length === 0 && (
            <div className="text-center py-8">
              <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No executions found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by executing a workflow from the catalog'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}