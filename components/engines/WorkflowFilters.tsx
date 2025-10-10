'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WorkflowFiltersProps {
  categories: string[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  onClose: () => void
}

export function WorkflowFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  onClose
}: WorkflowFiltersProps) {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">Filters</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCategoryChange('All Categories')}
          >
            Clear All
          </Button>
          <Button
            size="sm"
            onClick={onClose}
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}