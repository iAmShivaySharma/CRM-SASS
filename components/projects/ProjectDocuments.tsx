'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import jsPDF from 'jspdf'
import { useAppSelector } from '@/lib/hooks'
import {
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
} from '@/lib/api/projectsApi'
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
import { CardSkeleton } from '@/components/ui/skeleton'
import { extractPlainText } from '@/components/ui/tiptap-editor-improved'
import { toast } from 'sonner'
import type { Document } from '@/lib/api/projectsApi'

interface ProjectDocumentsProps {
  projectId: string
  documents: Document[]
  isLoading: boolean
  onEditDocument?: (document: Document) => void
}

export function ProjectDocuments({ projectId, documents, isLoading, onEditDocument }: ProjectDocumentsProps) {
  const router = useRouter()
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [createDocument] = useCreateDocumentMutation()
  const [deleteDocument] = useDeleteDocumentMutation()

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
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  )

  const handleCreateDocument = async () => {
    if (!currentWorkspace || !projectId) {
      toast.error('Unable to create document - missing project information')
      return
    }

    try {
      const result = await createDocument({
        title: 'Untitled Document',
        content: '',
        projectId: projectId,
        workspaceId: currentWorkspace.id,
        type: 'document',
        status: 'draft',
        visibility: 'project',
      }).unwrap()

      toast.success('Document created successfully')
      router.push(`/projects/documents/${result.document.id}`)
    } catch (error) {
      console.error('Failed to create document:', error)
      toast.error('Failed to create document')
    }
  }

  const handleEditDocument = (document: Document) => {
    router.push(`/projects/documents/${document.id}`)
  }

  const handleViewDocument = (document: Document) => {
    router.push(`/projects/documents/${document.id}`)
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      await deleteDocument({ id: documentId }).unwrap()
      toast.success('Document deleted successfully')
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleDownloadDocument = (doc: Document) => {
    try {
      // Create PDF
      const pdf = new jsPDF()
      const content = extractPlainText(doc.content)
      const filename = `${doc.title.replace(/[^a-z0-9\s]/gi, '_').replace(/\s+/g, '_')}.pdf`

      // Add title
      pdf.setFontSize(20)
      pdf.text(doc.title, 20, 30)

      // Add creation date
      pdf.setFontSize(12)
      pdf.text(`Created: ${new Date(doc.createdAt).toLocaleDateString()}`, 20, 45)
      pdf.text(`Updated: ${new Date(doc.updatedAt).toLocaleDateString()}`, 20, 55)

      // Add content
      pdf.setFontSize(11)

      // Split content into lines that fit the page width
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margins = 20
      const maxLineWidth = pageWidth - (margins * 2)

      const lines = pdf.splitTextToSize(content, maxLineWidth)

      let currentY = 75
      const lineHeight = 7
      const pageHeight = pdf.internal.pageSize.getHeight()

      lines.forEach((line: string) => {
        if (currentY + lineHeight > pageHeight - margins) {
          pdf.addPage()
          currentY = margins
        }
        pdf.text(line, margins, currentY)
        currentY += lineHeight
      })

      // Download the PDF
      pdf.save(filename)
      toast.success('Document downloaded as PDF')
    } catch (error) {
      console.error('PDF generation failed:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const handleEditClick = (document: Document) => (e: React.MouseEvent) => {
    e.stopPropagation()
    handleEditDocument(document)
  }

  const handleDoubleClick = (document: Document) => (e: React.MouseEvent) => {
    e.stopPropagation()
    handleEditDocument(document)
  }

  if (isLoading) {
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
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
              disabled
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-input p-1">
            <Button variant="ghost" size="sm" disabled>
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
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
        <Button onClick={handleCreateDocument}>
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
                <Button onClick={handleCreateDocument}>
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
                      <DropdownMenuItem
                        onClick={() => handleViewDocument(document)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleEditClick(document)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadDocument(document)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteDocument(document.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                  {extractPlainText(document.content, 150)}
                </p>

                {/* Tags */}
                {document.tags && document.tags.length > 0 && (
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
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">U</span>
                    </div>
                    <span>Created by user</span>
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
                        {extractPlainText(document.content, 100)}
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
                        <DropdownMenuItem
                          onClick={() => handleViewDocument(document)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleEditClick(document)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownloadDocument(document)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
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
