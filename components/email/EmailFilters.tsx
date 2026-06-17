'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Filter, X, Calendar, User, Flag, Paperclip, Star } from 'lucide-react'

interface EmailFiltersProps {
  currentFolder: string
  filters: any
  onFiltersChange: (filters: any) => void
}

export function EmailFilters({ currentFolder, filters, onFiltersChange }: EmailFiltersProps) {
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
    <div className="flex items-start gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8"
          >
            <Filter className="h-3 w-3 mr-2" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-white text-primary text-[10px] font-semibold leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => updateFilter('isRead', filters.isRead === false ? null : false)}>
            <div className="flex items-center justify-between w-full">
              <span>Unread only</span>
              {filters.isRead === false && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('isRead', filters.isRead === true ? null : true)}>
            <div className="flex items-center justify-between w-full">
              <span>Read only</span>
              {filters.isRead === true && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => updateFilter('isStarred', !filters.isStarred)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Star className="h-3 w-3 mr-2" />
                <span>Starred</span>
              </div>
              {filters.isStarred && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('isImportant', !filters.isImportant)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Flag className="h-3 w-3 mr-2" />
                <span>Important</span>
              </div>
              {filters.isImportant && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('hasAttachments', !filters.hasAttachments)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Paperclip className="h-3 w-3 mr-2" />
                <span>Has Attachments</span>
              </div>
              {filters.hasAttachments && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => updateFilter('priority', filters.priority === 'high' ? null : 'high')}>
            <div className="flex items-center justify-between w-full">
              <span>High Priority</span>
              {filters.priority === 'high' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('priority', filters.priority === 'low' ? null : 'low')}>
            <div className="flex items-center justify-between w-full">
              <span>Low Priority</span>
              {filters.priority === 'low' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => updateFilter('direction', filters.direction === 'inbound' ? null : 'inbound')}>
            <div className="flex items-center justify-between w-full">
              <span>Received Emails</span>
              {filters.direction === 'inbound' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('direction', filters.direction === 'outbound' ? null : 'outbound')}>
            <div className="flex items-center justify-between w-full">
              <span>Sent Emails</span>
              {filters.direction === 'outbound' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => updateFilter('dateRange', filters.dateRange === '1' ? null : '1')}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                <span>Today</span>
              </div>
              {filters.dateRange === '1' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('dateRange', filters.dateRange === '7' ? null : '7')}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                <span>Last 7 days</span>
              </div>
              {filters.dateRange === '7' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('dateRange', filters.dateRange === '30' ? null : '30')}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                <span>Last 30 days</span>
              </div>
              {filters.dateRange === '30' && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => updateFilter('linkedToCRM', !filters.linkedToCRM)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-2" />
                <span>Linked to CRM</span>
              </div>
              {filters.linkedToCRM && <span className="text-primary text-xs">✓</span>}
            </div>
          </DropdownMenuItem>

          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearAllFilters} className="text-red-600">
                <X className="h-3 w-3 mr-2" />
                Clear All Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(filters).map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="h-5 text-[10px] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0"
              onClick={() => updateFilter(key, null)}
            >
              {getFilterDisplayName(key, value)}
              <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}