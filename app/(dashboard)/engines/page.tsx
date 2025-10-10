'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Zap, DollarSign, Clock, Users, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkflowCard } from '@/components/engines/WorkflowCard'
import { WorkflowFilters } from '@/components/engines/WorkflowFilters'
import { ExecuteWorkflowModal } from '@/components/engines/ExecuteWorkflowModal'
import { ApiKeyManagementButton } from '@/components/engines/ApiKeyManagementButton'
import { useGetWorkflowCatalogQuery, useSyncWorkflowsMutation } from '@/lib/api/enginesApi'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'


export default function EnginesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [showExecuteModal, setShowExecuteModal] = useState(false)

  // Fetch workflow catalog data
  const {
    data: catalogData,
    isLoading,
    error,
    refetch
  } = useGetWorkflowCatalogQuery({
    category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
    search: searchTerm || undefined,
    limit: 50
  })

  // Sync workflows mutation
  const [syncWorkflows, { isLoading: isSyncing }] = useSyncWorkflowsMutation()

  const workflows = catalogData?.data?.workflows || []
  const categories = ['All Categories', ...(catalogData?.data?.categories?.map(c => c.name) || [])]

  const handleExecuteWorkflow = (workflow: any) => {
    setSelectedWorkflow(workflow)
    setShowExecuteModal(true)
  }

  const totalWorkflows = workflows.length
  const avgCost = workflows.length > 0
    ? workflows.reduce((sum, w) => sum + w.estimatedCost, 0) / totalWorkflows
    : 0
  const totalUsage = workflows.reduce((sum, w) => sum + w.usage.totalExecutions, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Execution Engine</h1>
          <p className="text-muted-foreground">
            Run pre-built workflows instantly with your own API keys or our platform keys
          </p>
        </div>
        <div className="flex space-x-3">
          <ApiKeyManagementButton />
          <Button
            variant="outline"
            onClick={() => syncWorkflows()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Workflows
              </>
            )}
          </Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80">
            <Plus className="mr-2 h-4 w-4" />
            Request Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Total Workflows</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{totalWorkflows}</p>
          <p className="text-sm text-muted-foreground">Available for execution</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Avg. Cost</h3>
          </div>
          <p className="text-2xl font-bold mt-2">${avgCost.toFixed(3)}</p>
          <p className="text-sm text-muted-foreground">Per execution</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Avg. Time</h3>
          </div>
          <p className="text-2xl font-bold mt-2">45s</p>
          <p className="text-sm text-muted-foreground">Execution time</p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Total Usage</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{totalUsage.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">All-time executions</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Filters Panel */}
      {showFilters && (
        <WorkflowFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Error State */}
      {error && (
        <Alert className="border-destructive">
          <AlertDescription>
            Failed to load workflows. Please try refreshing or syncing workflows from n8n.
          </AlertDescription>
        </Alert>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `Showing ${workflows.length} workflows`}
        </p>
      </div>

      {/* Loading State */}
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

      {/* Workflow Grid */}
      {!isLoading && workflows.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
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
                inputSchema: workflow.inputSchema
              }}
              onExecute={() => handleExecuteWorkflow(workflow)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && workflows.length === 0 && !error && (
        <div className="text-center py-12">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No workflows found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'All Categories'
              ? 'Try adjusting your search terms or filters.'
              : 'Sync workflows from your n8n instance to get started.'}
          </p>
          <Button
            onClick={() => syncWorkflows()}
            disabled={isSyncing}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Workflows from n8n
              </>
            )}
          </Button>
        </div>
      )}

      {/* Execute Workflow Modal */}
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
    </div>
  )
}