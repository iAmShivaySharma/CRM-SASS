'use client'

import { Filter, X, Calendar, User, Flag, Paperclip, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface EmailFiltersProps {
  currentFolder: string
  filters: any
  onFiltersChange: (filters: any) => void
}

export function EmailFilters({
  currentFolder,
  filters,
  onFiltersChange,
}: EmailFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters }
    if (value === null || value === undefined || value === '') {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const activeFilterCount = Object.keys(filters).length

  const getFilterDisplayName = (key: string, value: any) => {
    switch (key) {
      case 'isRead':
        return value ? 'Read' : 'Unread'
      case 'isStarred':
        return 'Starred'
      case 'isImportant':
        return 'Important'
      case 'hasAttachments':
        return 'Has Attachments'
      case 'priority':
        return `${value} Priority`
      case 'direction':
        return value === 'inbound' ? 'Received' : 'Sent'
      case 'dateRange':
        return `${value} days`
      case 'linkedToCRM':
        return 'Linked to CRM'
      default:
        return `${key}: ${value}`
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            <Filter className="mr-2 h-3 w-3" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold leading-none text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() =>
              updateFilter('isRead', filters.isRead === false ? null : false)
            }
          >
            <div className="flex w-full items-center justify-between">
              <span>Unread only</span>
              {filters.isRead === false && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateFilter('isRead', filters.isRead === true ? null : true)
            }
          >
            <div className="flex w-full items-center justify-between">
              <span>Read only</span>
              {filters.isRead === true && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => updateFilter('isStarred', !filters.isStarred)}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <Star className="mr-2 h-3 w-3" />
                <span>Starred</span>
              </div>
              {filters.isStarred && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => updateFilter('isImportant', !filters.isImportant)}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <Flag className="mr-2 h-3 w-3" />
                <span>Important</span>
              </div>
              {filters.isImportant && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateFilter('hasAttachments', !filters.hasAttachments)
            }
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <Paperclip className="mr-2 h-3 w-3" />
                <span>Has Attachments</span>
              </div>
              {filters.hasAttachments && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              updateFilter(
                'priority',
                filters.priority === 'high' ? null : 'high'
              )
            }
          >
            <div className="flex w-full items-center justify-between">
              <span>High Priority</span>
              {filters.priority === 'high' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateFilter(
                'priority',
                filters.priority === 'low' ? null : 'low'
              )
            }
          >
            <div className="flex w-full items-center justify-between">
              <span>Low Priority</span>
              {filters.priority === 'low' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              updateFilter(
                'direction',
                filters.direction === 'inbound' ? null : 'inbound'
              )
            }
          >
            <div className="flex w-full items-center justify-between">
              <span>Received Emails</span>
              {filters.direction === 'inbound' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateFilter(
                'direction',
                filters.direction === 'outbound' ? null : 'outbound'
              )
            }
          >
            <div className="flex w-full items-center justify-between">
              <span>Sent Emails</span>
              {filters.direction === 'outbound' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              updateFilter('dateRange', filters.dateRange === '1' ? null : '1')
            }
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <Calendar className="mr-2 h-3 w-3" />
                <span>Today</span>
              </div>
              {filters.dateRange === '1' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateFilter('dateRange', filters.dateRange === '7' ? null : '7')
            }
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <Calendar className="mr-2 h-3 w-3" />
                <span>Last 7 days</span>
              </div>
              {filters.dateRange === '7' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateFilter(
                'dateRange',
                filters.dateRange === '30' ? null : '30'
              )
            }
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <Calendar className="mr-2 h-3 w-3" />
                <span>Last 30 days</span>
              </div>
              {filters.dateRange === '30' && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => updateFilter('linkedToCRM', !filters.linkedToCRM)}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <User className="mr-2 h-3 w-3" />
                <span>Linked to CRM</span>
              </div>
              {filters.linkedToCRM && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>

          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={clearAllFilters}
                className="text-red-600"
              >
                <X className="mr-2 h-3 w-3" />
                Clear All Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {Object.entries(filters).map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="h-5 shrink-0 cursor-pointer text-[10px] hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => updateFilter(key, null)}
            >
              {getFilterDisplayName(key, value)}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
