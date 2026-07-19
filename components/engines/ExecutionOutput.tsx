'use client'

import { useState, useCallback } from 'react'
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  Video,
  FileText,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

function isMediaUrl(url: string): 'image' | 'video' | null {
  if (typeof url !== 'string') return null
  const lower = url.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/.test(lower)) return 'image'
  if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/.test(lower)) return 'video'
  if (lower.includes('creatomate') && lower.includes('.mp4')) return 'video'
  if (lower.includes('pexels') || lower.includes('unsplash')) return 'image'
  return null
}

function isUrl(value: any): boolean {
  if (typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

function detectMediaFields(data: any): {
  images: string[]
  videos: string[]
  otherFields: Record<string, any>
} {
  const images: string[] = []
  const videos: string[] = []
  const otherFields: Record<string, any> = {}

  if (!data || typeof data !== 'object') return { images, videos, otherFields }

  const obj = Array.isArray(data) ? data[0] : data

  for (const [key, value] of Object.entries(obj || {})) {
    if (!isUrl(value as string)) {
      otherFields[key] = value
      continue
    }

    const urlStr = value as string
    const keyLower = key.toLowerCase()

    if (
      keyLower.includes('image') ||
      keyLower.includes('img') ||
      keyLower.includes('photo') ||
      keyLower.includes('thumbnail')
    ) {
      images.push(urlStr)
    } else if (
      keyLower.includes('video') ||
      keyLower.includes('mp4') ||
      keyLower.includes('render')
    ) {
      videos.push(urlStr)
    } else {
      const mediaType = isMediaUrl(urlStr)
      if (mediaType === 'image') images.push(urlStr)
      else if (mediaType === 'video') videos.push(urlStr)
      else otherFields[key] = value
    }
  }

  return { images, videos, otherFields }
}

const ASPECT_RATIOS = [
  { label: 'Original', value: 'original' },
  { label: '1:1 Square', value: '1:1' },
  { label: '4:5 Portrait', value: '4:5' },
  { label: '9:16 Story/Reel', value: '9:16' },
  { label: '16:9 Landscape', value: '16:9' },
  { label: '4:3 Standard', value: '4:3' },
]

function fitAndDownload(url: string, ratio: string, filename: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (ratio === 'original') {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
    } else {
      const [rw, rh] = ratio.split(':').map(Number)
      const destRatio = rw / rh
      const srcRatio = img.naturalWidth / img.naturalHeight

      if (srcRatio > destRatio) {
        canvas.width = img.naturalWidth
        canvas.height = Math.round(img.naturalWidth / destRatio)
      } else {
        canvas.height = img.naturalHeight
        canvas.width = Math.round(img.naturalHeight * destRatio)
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const dx = Math.round((canvas.width - img.naturalWidth) / 2)
      const dy = Math.round((canvas.height - img.naturalHeight) / 2)
      ctx.drawImage(img, dx, dy)
    }

    canvas.toBlob(blob => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${filename}-${ratio.replace(':', 'x')}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }
  img.onerror = () => {
    window.open(url, '_blank')
  }
  img.src = url
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  )
}

function MediaDownloadButton({
  url,
  type,
}: {
  url: string
  type: 'image' | 'video'
}) {
  const [converting, setConverting] = useState(false)

  const handleDownload = useCallback(
    (ratio: string) => {
      if (type === 'video' || ratio === 'original') {
        const a = document.createElement('a')
        a.href = url
        a.download = ''
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
        return
      }

      setConverting(true)
      fitAndDownload(url, ratio, 'output')
      setTimeout(() => setConverting(false), 2000)
    },
    [url, type]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={converting}
        >
          {converting ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Download className="mr-1 h-3 w-3" />
          )}
          Download
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs">Aspect Ratio</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ASPECT_RATIOS.map(r => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => handleDownload(r.value)}
            className="text-xs"
          >
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ExecutionOutputProps {
  data: any
  maxHeight?: string
}

export function ExecutionOutput({
  data,
  maxHeight = '400px',
}: ExecutionOutputProps) {
  if (!data) {
    return <span className="text-sm text-muted-foreground">No output</span>
  }

  if (typeof data === 'string') {
    return (
      <div className="rounded border bg-muted/50 p-3 text-sm">
        <p className="whitespace-pre-wrap">{data}</p>
      </div>
    )
  }

  const items = Array.isArray(data) ? data : [data]
  const { images, videos, otherFields } = detectMediaFields(data)
  const hasMedia = images.length > 0 || videos.length > 0

  return (
    <div className="space-y-3" style={{ maxHeight, overflow: 'auto' }}>
      {videos.map((url, i) => (
        <div key={`video-${i}`} className="overflow-hidden rounded-lg border">
          <div className="flex items-center space-x-2 border-b px-3 py-1.5">
            <Video className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium">Video</span>
          </div>
          <div className="flex items-center justify-center bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={url}
              controls
              className="max-h-[280px]"
              preload="metadata"
            />
          </div>
          <div className="flex items-center space-x-1 border-t px-3 py-1.5">
            <MediaDownloadButton url={url} type="video" />
            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                Open
              </a>
            </Button>
            <CopyButton text={url} />
          </div>
        </div>
      ))}

      {images.map((url, i) => (
        <div key={`image-${i}`} className="overflow-hidden rounded-lg border">
          <div className="flex items-center space-x-2 border-b px-3 py-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium">Image</span>
          </div>
          <div className="flex justify-center">
            <img
              src={url}
              alt="Workflow output"
              className="block max-h-[320px] w-auto"
            />
          </div>
          <div className="flex items-center space-x-1 border-t px-3 py-1.5">
            <MediaDownloadButton url={url} type="image" />
            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                Open
              </a>
            </Button>
            <CopyButton text={url} />
          </div>
        </div>
      ))}

      {Object.keys(otherFields).length > 0 && (
        <div className="space-y-1">
          {!hasMedia && (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Output Data</span>
            </div>
          )}
          {Object.entries(otherFields).map(([key, value]) => {
            if (
              key === 'text' ||
              key === 'caption' ||
              key === 'content' ||
              key === 'script'
            ) {
              return (
                <div key={key} className="rounded border bg-muted/50 p-3">
                  <div className="mb-1 text-xs font-medium capitalize text-muted-foreground">
                    {key}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{String(value)}</p>
                </div>
              )
            }
            return null
          })}

          {(() => {
            const nonTextFields = Object.entries(otherFields).filter(
              ([key]) => !['text', 'caption', 'content', 'script'].includes(key)
            )
            if (nonTextFields.length === 0) return null
            return (
              <div className="rounded border bg-muted/50 p-2 text-xs">
                <pre className="overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(Object.fromEntries(nonTextFields), null, 2)}
                </pre>
              </div>
            )
          })()}
        </div>
      )}

      {!hasMedia &&
        Object.keys(otherFields).length === 0 &&
        items.length > 0 && (
          <div className="rounded border bg-muted/50 p-3 text-xs">
            <pre className="overflow-auto whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
    </div>
  )
}
