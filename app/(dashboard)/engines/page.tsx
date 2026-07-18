'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Filter,
  Zap,
  DollarSign,
  Clock,
  Users,
  RefreshCw,
  Bell,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { WorkflowCard } from '@/components/engines/WorkflowCard'
import { WorkflowFilters } from '@/components/engines/WorkflowFilters'
import { ExecuteWorkflowModal } from '@/components/engines/ExecuteWorkflowModal'
import { ApiKeyManagementButton } from '@/components/engines/ApiKeyManagementButton'
import {
  PendingInputsModal,
  type PendingInput,
} from '@/components/engines/PendingInputsModal'
import {
  useGetWorkflowCatalogQuery,
  useGetPendingInputsQuery,
} from '@/lib/api/enginesApi'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export default function EnginesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [showPendingInputs, setShowPendingInputs] = useState(false)
  const router = useRouter()

  const { data: pendingInputsData, isLoading: isPendingLoading } =
    useGetPendingInputsQuery({ limit: 20 }, { pollingInterval: 30000 })

  const pendingInputs = (pendingInputsData?.data?.inputs ||
    []) as PendingInput[]
  const pendingCount = pendingInputsData?.data?.summary?.totalPending || 0
  const highPriorityCount =
    pendingInputsData?.data?.summary?.highPriorityCount || 0

  const {
    data: catalogData,
    isLoading,
    error,
    refetch,
  } = useGetWorkflowCatalogQuery({
    category:
      selectedCategory !== 'All Categories' ? selectedCategory : undefined,
    search: searchTerm || undefined,
    limit: 50,
  })

  const workflows = catalogData?.data?.workflows || []
  const categories = [
    'All Categories',
    ...(catalogData?.data?.categories?.map(c => c.name) || []),
  ]

  const handleExecuteWorkflow = (workflow: any) => {
    const resolvedId = workflow._id || workflow.n8nWorkflowId || workflow.id
    console.log(
      '[Engines] Execute workflow - raw keys:',
      Object.keys(workflow),
      'resolved ID:',
      resolvedId
    )
    setSelectedWorkflow({
      id: resolvedId,
      _id: workflow._id,
      n8nWorkflowId: workflow.n8nWorkflowId,
      name: workflow.name,
      description: workflow.description,
      estimatedCost: workflow.estimatedCost,
      avgExecutionTime: workflow.usage?.avgExecutionTime || 0,
      requiresApiKey: workflow.requiresApiKey,
      inputSchema: workflow.inputSchema || {},
    })
    setShowExecuteModal(true)
  }

  const totalWorkflows = workflows.length
  const avgCost =
    workflows.length > 0
      ? workflows.reduce((sum, w) => sum + w.estimatedCost, 0) / totalWorkflows
      : 0
  const totalUsage = workflows.reduce(
    (sum, w) => sum + w.usage.totalExecutions,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Execution Engine
          </h1>
          <p className="text-muted-foreground">
            Run pre-built workflows instantly with your own API keys or our
            platform keys
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {pendingCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowPendingInputs(true)}
              className="relative"
            >
              <Bell className="mr-2 h-4 w-4" />
              Pending Inputs
              <Badge
                variant="destructive"
                className="min-w-5 ml-2 h-5 rounded-full px-1.5 text-xs"
              >
                {pendingCount}
              </Badge>
              {highPriorityCount > 0 && (
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
              )}
            </Button>
          )}
          <ApiKeyManagementButton />
          <Button
            variant="outline"
            onClick={() => router.push('/engines/executions')}
          >
            <Clock className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80">
            <Plus className="mr-2 h-4 w-4" />
            Request Workflow
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Total Workflows</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">{totalWorkflows}</p>
          <p className="text-sm text-muted-foreground">
            Available for execution
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Avg. Cost</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">${avgCost.toFixed(3)}</p>
          <p className="text-sm text-muted-foreground">Per execution</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Avg. Time</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {(() => {
              const withTime = workflows.filter(
                w => w.usage.avgExecutionTime > 0
              )
              if (withTime.length === 0) return '—'
              const avg = Math.round(
                withTime.reduce((sum, w) => sum + w.usage.avgExecutionTime, 0) /
                  withTime.length
              )
              return avg < 60
                ? `${avg}s`
                : `${Math.floor(avg / 60)}m ${avg % 60}s`
            })()}
          </p>
          <p className="text-sm text-muted-foreground">Execution time</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Total Usage</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {totalUsage.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">All-time executions</p>
        </div>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows by name, description, or tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="whitespace-nowrap"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {showFilters && (
        <WorkflowFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onClose={() => setShowFilters(false)}
        />
      )}

      {error && (
        <Alert className="border-destructive">
          <AlertDescription>
            Failed to load workflows. Please try refreshing or syncing workflows
            from n8n.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          ) : (
            `Showing ${workflows.length} workflows`
          )}
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map(workflow => (
            <WorkflowCard
              key={workflow._id}
              workflow={{
                id: workflow._id,
                name: workflow.name,
                description: workflow.description,
                category: workflow.categoryName,
                tags: workflow.tags,
                estimatedCost: workflow.estimatedCost,
                avgExecutionTime: workflow.usage.avgExecutionTime,
                usageCount: workflow.usage.totalExecutions,
                requiresApiKey: workflow.requiresApiKey,
                inputSchema: workflow.inputSchema,
              }}
              onExecute={() => handleExecuteWorkflow(workflow)}
            />
          ))}
        </div>
      )}

      {!isLoading && workflows.length === 0 && !error && (
        <div className="py-12 text-center">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No workflows found</h3>
          <p className="mb-4 text-muted-foreground">
            {searchTerm || selectedCategory !== 'All Categories'
              ? 'Try adjusting your search terms or filters.'
              : 'Create workflows in your n8n instance to get started.'}
          </p>
        </div>
      )}

      {showExecuteModal && selectedWorkflow && (
        <ExecuteWorkflowModal
          workflow={selectedWorkflow}
          isOpen={showExecuteModal}
          onClose={() => {
            setShowExecuteModal(false)
            setSelectedWorkflow(null)
          }}
        />
      )}

      <PendingInputsModal
        pendingInputs={pendingInputs}
        isOpen={showPendingInputs}
        onClose={() => setShowPendingInputs(false)}
        onInputSelected={input => {
          setShowPendingInputs(false)
          router.push(`/engines/executions/${input.execution._id}/input`)
        }}
        isLoading={isPendingLoading}
      />
    </div>
  )
}
