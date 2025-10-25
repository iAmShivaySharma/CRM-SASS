'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Calendar, Folder, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TiptapReader } from '@/components/ui/tiptap-editor-improved'

interface PublicDocument {
  id: string
  title: string
  content: string
  type: string
  createdAt: string
  updatedAt: string
  projectName: string
}

export default function PublicDocumentPage() {
  const params = useParams()
  const [document, setDocument] = useState<PublicDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/shared/documents/${params.id}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Document not found')
          } else {
            setError('Failed to load document')
          }
          return
        }

        const data = await response.json()
        setDocument(data.document)
      } catch (err) {
        setError('Failed to load document')
        console.error('Error fetching document:', err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchDocument()
    }
  }, [params.id])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="flex h-96 items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading document...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Card className="border-dashed">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">{error || 'Document not found'}</h3>
                  <p className="text-sm text-muted-foreground">
                    The document you're looking for doesn't exist or is not available for public viewing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Document Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start space-x-4">
              <div className="text-3xl">
                {getDocumentIcon(document.type)}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl font-bold break-words">
                  {document.title}
                </CardTitle>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={getTypeColor(document.type)}
                  >
                    {document.type}
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Folder className="h-4 w-4" />
                    <span>{document.projectName}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Document Content */}
        <Card>
          <CardContent className="p-0">
            <TiptapReader
              content={document.content}
              className="border-0 shadow-none"
              minHeight="400px"
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          This document is shared publicly for viewing only.
        </div>
      </div>
    </div>
  )
}