'use client'

import { useState, useEffect } from 'react'
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
  Folder,
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetProjectsQuery,
  useGetDocumentsQuery,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
} from '@/lib/api/projectsApi'
import { useGetUserPreferencesQuery, usePatchUserPreferencesMutation } from '@/lib/api/userPreferencesApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DocumentEditorDialog } from '@/components/projects/DocumentEditorDialog'
import {
  TiptapReader,
  extractPlainText,
} from '@/components/ui/tiptap-editor-improved'
import { StatsCardSkeleton, CardSkeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function ProjectDocumentsPage() {
  const router = useRouter()
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showEditorDialog, setShowEditorDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)

  // Get user preferences for project selection persistence
  const { data: userPreferences } = useGetUserPreferencesQuery()
  const [patchUserPreferences] = usePatchUserPreferencesMutation()

  // Get available projects
  const { data: projectsData } = useGetProjectsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
    },
    {
      skip: !currentWorkspace?.id,
    }
  )

  // Get documents for the selected project
  const {
    data: documentsData,
    isLoading: documentsLoading,
    error: documentsError,
  } = useGetDocumentsQuery(
    {
      projectId: projectFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
      search: search || undefined,
    },
    {
      skip:
        !currentWorkspace?.id ||
        projectFilter === 'all' ||
        !projectFilter ||
        projectFilter === '',
    }
  )

  const [createDocument] = useCreateDocumentMutation()
  const [deleteDocument] = useDeleteDocumentMutation()

  // Load saved project selection from preferences
  useEffect(() => {
    if (userPreferences?.preferences?.workspace?.selectedProjectId && projectsData?.projects) {
      const savedProjectId = userPreferences.preferences.workspace.selectedProjectId
      const projectExists = projectsData.projects.some(p => p.id === savedProjectId)
      if (projectExists) {
        setProjectFilter(savedProjectId)
      }
    }
  }, [userPreferences, projectsData])

  // Save project selection to preferences
  const handleProjectFilterChange = async (projectId: string) => {
    setProjectFilter(projectId)

    if (projectId !== 'all') {
      try {
        await patchUserPreferences({
          workspace: {
            selectedProjectId: projectId,
            lastActiveProjectId: projectId
          }
        })
      } catch (error) {
        console.error('Failed to save project selection:', error)
      }
    }
  }

  const documents = documentsData?.documents || []

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

  const handleCreateDocument = async () => {
    if (!currentWorkspace || projectFilter === 'all' || !projectFilter) {
      toast.error('Please select a specific project to create a document')
      return
    }

    try {
      const result = await createDocument({
        title: 'Untitled Document',
        content: '',
        projectId: projectFilter,
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

  const handleEditDocument = (document: any) => {
    router.push(`/projects/documents/${document.id}`)
  }

  const handleViewDocument = (document: any) => {
    router.push(`/projects/documents/${document.id}`)
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument({ id: documentId }).unwrap()
      toast.success('Document deleted successfully')
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error('Failed to delete document')
    }
  }

  // Apply additional filtering on the client side
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      search === '' ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.tags &&
        doc.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))

    const matchesType = typeFilter === 'all' || doc.type === typeFilter

    return matchesSearch && matchesType
  })

  if (!currentWorkspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Project Documents
          </h1>
          <p className="text-muted-foreground">
            Create and manage documents with rich text editing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectFilter !== 'all' && projectFilter && (
            <Badge variant="outline" className="text-sm">
              {projectsData?.projects.find(p => p.id === projectFilter)?.name ||
                'Unknown Project'}
            </Badge>
          )}
          <Button
            onClick={handleCreateDocument}
            disabled={projectFilter === 'all' || !projectFilter}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDocuments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredDocuments.filter(d => d.type === 'template').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredDocuments.filter(d => d.type === 'document').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsData?.projects.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="template">Templates</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={handleProjectFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectsData?.projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      {documentsLoading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="space-y-4">
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
          </div>
        )
      ) : documentsError ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-sm text-red-500">Error loading documents</div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No documents found</h3>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? 'Try adjusting your search terms'
                    : projectFilter === 'all'
                      ? 'Select a project to view its documents'
                      : 'Create your first document to get started'}
                </p>
              </div>
              {!search && projectFilter !== 'all' && projectFilter && (
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
              className="group transition-all hover:shadow-md"
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
                        <span className="text-xs text-muted-foreground">
                          {projectsData?.projects.find(
                            p => p.id === document.projectId
                          )?.name || 'Unknown Project'}
                        </span>
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
                      <DropdownMenuItem
                        onClick={() => handleEditDocument(document)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
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
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">U</AvatarFallback>
                    </Avatar>
                    <span>Unknown User</span>
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
            <Card key={document.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center space-x-4">
                    <div className="text-xl">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium">{document.title}</h3>
                      <div className="mt-1 flex items-center space-x-2">
                        <p className="truncate text-sm text-muted-foreground">
                          {projectsData?.projects.find(
                            p => p.id === document.projectId
                          )?.name || 'Unknown Project'}
                        </p>
                        <span className="text-muted-foreground">•</span>
                        <p className="truncate text-sm text-muted-foreground">
                          {extractPlainText(document.content, 100)}
                        </p>
                      </div>
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
                        <DropdownMenuItem
                          onClick={() => handleEditDocument(document)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
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

      {/* Document Editor Dialog */}
      {projectFilter && projectFilter !== 'all' && (
        <DocumentEditorDialog
          open={showEditorDialog}
          onOpenChange={open => {
            setShowEditorDialog(open)
            if (!open) {
              setSelectedDocument(null)
            }
          }}
          projectId={projectFilter}
          document={selectedDocument}
        />
      )}
    </div>
  )
}
