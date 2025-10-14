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
    <div className="flex items-center space-x-2">
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
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {/* Read Status */}
          <DropdownMenuItem onClick={() => updateFilter('isRead', false)}>
            <div className="flex items-center justify-between w-full">
              <span>Unread only</span>
              {filters.isRead === false && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('isRead', true)}>
            <div className="flex items-center justify-between w-full">
              <span>Read only</span>
              {filters.isRead === true && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Special Flags */}
          <DropdownMenuItem onClick={() => updateFilter('isStarred', !filters.isStarred)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Star className="h-3 w-3 mr-2" />
                <span>Starred</span>
              </div>
              {filters.isStarred && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('isImportant', !filters.isImportant)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Flag className="h-3 w-3 mr-2" />
                <span>Important</span>
              </div>
              {filters.isImportant && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('hasAttachments', !filters.hasAttachments)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Paperclip className="h-3 w-3 mr-2" />
                <span>Has Attachments</span>
              </div>
              {filters.hasAttachments && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Priority */}
          <DropdownMenuItem onClick={() => updateFilter('priority', 'high')}>
            <div className="flex items-center justify-between w-full">
              <span>High Priority</span>
              {filters.priority === 'high' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('priority', 'low')}>
            <div className="flex items-center justify-between w-full">
              <span>Low Priority</span>
              {filters.priority === 'low' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Direction */}
          <DropdownMenuItem onClick={() => updateFilter('direction', 'inbound')}>
            <div className="flex items-center justify-between w-full">
              <span>Received Emails</span>
              {filters.direction === 'inbound' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('direction', 'outbound')}>
            <div className="flex items-center justify-between w-full">
              <span>Sent Emails</span>
              {filters.direction === 'outbound' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Date Range */}
          <DropdownMenuItem onClick={() => updateFilter('dateRange', '1')}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                <span>Today</span>
              </div>
              {filters.dateRange === '1' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('dateRange', '7')}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                <span>Last 7 days</span>
              </div>
              {filters.dateRange === '7' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => updateFilter('dateRange', '30')}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                <span>Last 30 days</span>
              </div>
              {filters.dateRange === '30' && <Badge variant="secondary">✓</Badge>}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* CRM Integration */}
          <DropdownMenuItem onClick={() => updateFilter('linkedToCRM', !filters.linkedToCRM)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-2" />
                <span>Linked to CRM</span>
              </div>
              {filters.linkedToCRM && <Badge variant="secondary">✓</Badge>}
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

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex items-center space-x-1 flex-wrap">
          {Object.entries(filters).map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="h-6 text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => updateFilter(key, null)}
            >
              {getFilterDisplayName(key, value)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}