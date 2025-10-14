'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Video, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAppSelector } from '@/lib/hooks'
import { useUploadFileMutation, useGetUploadConfigQuery } from '@/lib/api/chatApi'

interface TaskFile {
  name: string
  url: string
  type: string
  size: number
}

interface TaskFileUploaderProps {
  onFilesChange: (files: TaskFile[]) => void
  existingFiles?: TaskFile[]
  maxFiles?: number
  disabled?: boolean
  className?: string
}

export function TaskFileUploader({
  onFilesChange,
  existingFiles = [],
  maxFiles = 5,
  disabled = false,
  className = '',
}: TaskFileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const [uploadFile] = useUploadFileMutation()
  const { data: uploadConfig } = useGetUploadConfigQuery()

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />
    } else if (fileType.startsWith('video/')) {
      return <Video className="h-4 w-4 text-purple-500" />
    } else {
      return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    const allowedTypes = uploadConfig?.config.allowedTypes || []
    const maxSize = uploadConfig?.config.maxFileSize || 10 * 1024 * 1024

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`
    }

    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(2)}MB limit`
    }

    return null
  }

  const handleFileUpload = useCallback(async (file: File): Promise<TaskFile | null> => {
    if (!currentWorkspace) {
      throw new Error('No workspace selected')
    }

    const validation = validateFile(file)
    if (validation) {
      toast.error(validation)
      return null
    }

    try {
      const result = await uploadFile({
        file,
        workspaceId: currentWorkspace.id,
        chatRoomId: 'tasks', // Use 'tasks' as a special chat room ID for task files
      }).unwrap()

      if (result.success && result.file.url) {
        return {
          name: result.file.name,
          url: result.file.url,
          type: result.file.type,
          size: result.file.size,
        }
      }
      throw new Error('Upload failed')
    } catch (error) {
      console.error('File upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      toast.error(`Failed to upload ${file.name}: ${errorMessage}`)
      return null
    }
  }, [currentWorkspace, uploadFile, validateFile])

  const handleFiles = useCallback(
    async (files: FileList) => {
      console.log('handleFiles called with:', files.length, 'files')

      if (disabled || isUploading) {
        console.log('Upload blocked:', { disabled, isUploading })
        return
      }

      if (!currentWorkspace) {
        console.error('No current workspace available')
        toast.error('No workspace selected. Please select a workspace first.')
        return
      }

      const fileArray = Array.from(files)
      console.log('Processing files:', fileArray.map(f => f.name))

      // Check file count limit
      if (existingFiles.length + fileArray.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        return
      }

      setIsUploading(true)
      try {
        const uploadPromises = fileArray.map(handleFileUpload)
        const results = await Promise.all(uploadPromises)
        const successfulUploads = results.filter(Boolean) as TaskFile[]

        if (successfulUploads.length > 0) {
          const updatedFiles = [...existingFiles, ...successfulUploads]
          onFilesChange(updatedFiles)
          toast.success(`${successfulUploads.length} file(s) uploaded successfully`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error('Failed to upload files')
      } finally {
        setIsUploading(false)
      }
    },
    [existingFiles, maxFiles, disabled, isUploading, onFilesChange, currentWorkspace, handleFileUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('File input changed:', e.target.files?.length, 'files')
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files)
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (fileToRemove: TaskFile) => {
      const updatedFiles = existingFiles.filter(
        file => file.url !== fileToRemove.url
      )
      onFilesChange(updatedFiles)
    },
    [existingFiles, onFilesChange]
  )

  const openFileDialog = useCallback((e?: React.MouseEvent) => {
    console.log('openFileDialog called', { disabled, isUploading, hasRef: !!fileInputRef.current })
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Use setTimeout to ensure the event is processed
    setTimeout(() => {
      if (fileInputRef.current && !disabled && !isUploading) {
        console.log('Clicking file input')
        fileInputRef.current.click()
      } else {
        console.log('Cannot click file input:', {
          hasRef: !!fileInputRef.current,
          disabled,
          isUploading
        })
      }
    }, 0)
  }, [disabled, isUploading])

  return (
    <>
      {/* Hidden file input - placed outside to avoid form conflicts */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={uploadConfig?.config.allowedTypes.join(',') || 'image/*,video/*,application/pdf,.doc,.docx,.txt'}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />

      <div className={`space-y-3 ${className}`} style={{ position: 'relative', zIndex: 1 }}>
        {/* Drop Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${
              dragActive
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
            }
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{
            position: 'relative',
            zIndex: 10,
            pointerEvents: disabled || isUploading ? 'none' : 'auto'
          }}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-blue-600">Uploading files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Images, videos, documents up to {uploadConfig?.config.maxFileSizeMB || 10}MB (max {maxFiles} files)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Choose Files button clicked')
                openFileDialog()
              }}
              disabled={disabled || isUploading}
              className="mt-2 relative z-20"
              style={{ position: 'relative', zIndex: 20 }}
            >
              Choose Files
            </Button>
          </div>
        )}
      </div>

      {/* File List */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Attached Files ({existingFiles.length})
          </p>
          {existingFiles.map((file, index) => (
            <div
              key={`${file.url}-${index}`}
              className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.open(file.url, '_blank')
                  }}
                  className="h-6 w-6 p-0"
                  title="View file"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeFile(file)
                  }}
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                  title="Remove file"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  )
}