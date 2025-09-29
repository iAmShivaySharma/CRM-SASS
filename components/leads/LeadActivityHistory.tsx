'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  History,
  User,
  Clock,
  Edit,
  UserCheck,
  ToggleLeft,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetLeadActivitiesQuery,
  type LeadActivity,
} from '@/lib/api/mongoApi'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface LeadActivityHistoryProps {
  leadId: string
  leadName: string
}

const activityTypeIcons = {
  created: User,
  updated: Edit,
  status_changed: ToggleLeft,
  assigned: UserCheck,
  note_added: FileText,
  converted: ArrowRight,
  deleted: User,
}

const activityTypeColors = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  status_changed: 'bg-purple-100 text-purple-800',
  assigned: 'bg-orange-100 text-orange-800',
  note_added: 'bg-gray-100 text-gray-800',
  converted: 'bg-emerald-100 text-emerald-800',
  deleted: 'bg-red-100 text-red-800',
}

function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    value: 'Value',
    source: 'Source',
    notes: 'Notes',
    statusId: 'Status',
    assignedTo: 'Assigned To',
    tagIds: 'Tags',
  }

  if (field.startsWith('customFields.') || field.startsWith('customData.')) {
    const customField = field.split('.')[1]
    return `Custom: ${customField}`
  }

  return fieldMap[field] || field
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return 'None'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'None'
  }
  return String(value)
}

function ActivityItem({ activity }: { activity: LeadActivity }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = activityTypeIcons[activity.activityType]
  const colorClass = activityTypeColors[activity.activityType]

  return (
    <div className="flex items-start space-x-3 border-b border-gray-100 p-4 last:border-b-0">
      <div className={`rounded-full p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900">
              {activity.description}
            </p>
            <Badge variant="outline" className="text-xs">
              {activity.activityType.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(activity.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* User information */}
        <div className="mt-1 flex items-center space-x-2">
          <User className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600">
            {typeof activity.performedBy === 'object'
              ? activity.performedBy.fullName
              : 'Unknown User'}
          </span>
        </div>

        {activity.changes && activity.changes.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-0 text-xs text-gray-600 hover:text-gray-900"
              >
                {isExpanded ? (
                  <ChevronDown className="mr-1 h-3 w-3" />
                ) : (
                  <ChevronRight className="mr-1 h-3 w-3" />
                )}
                {activity.changes.length} change
                {activity.changes.length !== 1 ? 's' : ''}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2 border-l-2 border-gray-200 pl-4">
                {activity.changes.map((change, index) => (
                  <div key={index} className="text-xs">
                    <div className="font-medium text-gray-700">
                      {formatFieldName(change.field)}
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <span className="rounded bg-red-50 px-2 py-1 text-red-700">
                        {formatFieldValue(change.oldValue)}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="rounded bg-green-50 px-2 py-1 text-green-700">
                        {formatFieldValue(change.newValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            {activity.metadata.totalChanges && (
              <span>Total changes: {activity.metadata.totalChanges}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function LeadActivityHistory({
  leadId,
  leadName,
}: LeadActivityHistoryProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [open, setOpen] = useState(false)

  const {
    data: activitiesData,
    isLoading,
    error,
    refetch,
  } = useGetLeadActivitiesQuery(
    {
      leadId,
      workspaceId: currentWorkspace?.id || '',
      limit: 100,
    },
    {
      skip: !currentWorkspace?.id || !open,
    }
  )

  const activities = activitiesData?.activities || []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Activity History</span>
          </DialogTitle>
          <DialogDescription>
            Complete history of changes made to &quot;{leadName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-red-600">
                Failed to load activity history
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <History className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No activity history found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-0">
                {activities.map(activity => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
