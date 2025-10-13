'use client'

import { useState } from 'react'
import {
  Plus,
  FileText,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Eye,
  Edit,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProjectDocumentsProps {
  projectId: string
  onEditDocument?: (document: any) => void
}

export function ProjectDocuments({ projectId, onEditDocument }: ProjectDocumentsProps) {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Placeholder data - this will be replaced with actual API calls
  const documents = [
    {
      id: '1',
      title: 'Project Requirements',
      type: 'document',
      content: 'Detailed project requirements and specifications...',
      createdBy: { id: '1', name: 'John Doe', avatarUrl: null },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      visibility: 'project',
      tags: ['requirements', 'specs'],
    },
    {
      id: '2',
      title: 'Meeting Notes Template',
      type: 'template',
      content: 'Standard template for project meeting notes...',
      createdBy: { id: '2', name: 'Jane Smith', avatarUrl: null },
      createdAt: '2024-01-18T09:15:00Z',
      updatedAt: '2024-01-18T09:15:00Z',
      visibility: 'workspace',
      tags: ['template', 'meetings'],
    },
  ]

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'template':
        return '📋'
      case 'note':
        return '📝'
      default:
        return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'template':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'note':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  const filteredDocuments = documents.filter(
    doc =>
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const handleEditClick = (document: any) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onEditDocument?.(document)
  }

  const handleDoubleClick = (document: any) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onEditDocument?.(document)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Project Documents
          </h2>
          <p className="text-muted-foreground">
            Create and manage project documentation
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents Display */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No documents found</h3>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? 'Try adjusting your search terms'
                    : 'Create your first document to get started'}
                </p>
              </div>
              {!search && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Document
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map(document => (
            <Card
              key={document.id}
              className="group transition-all hover:shadow-md cursor-pointer"
              onDoubleClick={handleDoubleClick(document)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-2 text-base">
                        {document.title}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={getTypeColor(document.type)}
                        >
                          {document.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleEditClick(document)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                  {document.content}
                </p>

                {/* Tags */}
                {document.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {document.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {document.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{document.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Author and Date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage
                        src={document.createdBy.avatarUrl || undefined}
                      />
                      <AvatarFallback className="text-xs">
                        {document.createdBy.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span>{document.createdBy.name}</span>
                  </div>
                  <span>
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map(document => (
            <Card
              key={document.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onDoubleClick={handleDoubleClick(document)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center space-x-4">
                    <div className="text-xl">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium">{document.title}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {document.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge
                      variant="secondary"
                      className={getTypeColor(document.type)}
                    >
                      {document.type}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {new Date(document.updatedAt).toLocaleDateString()}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleEditClick(document)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
