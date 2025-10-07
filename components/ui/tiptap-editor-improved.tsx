'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'

import { useCallback, useState, useEffect, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Save,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  MoreHorizontal,
  FileText,
  Strikethrough,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  onSave?: () => void
  editable?: boolean
  placeholder?: string
  className?: string
  minHeight?: string
}

export function TiptapEditor({
  content = '',
  onChange,
  onSave,
  editable = true,
  placeholder = 'Start writing...',
  className = '',
  minHeight = '500px',
}: TiptapEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const colorDropdownRef = useRef<HTMLDivElement>(null)

  // Get initial content - handle HTML strings
  const getInitialContent = useCallback(() => {
    if (!content || content.trim() === '') {
      return '<p></p>'
    }
    // Content is now expected to be an HTML string
    return content
  }, [content])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextStyle.configure({
        HTMLAttributes: {
          class: 'text-style',
        },
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm my-4',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: getInitialContent(),
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Use HTML format for better compatibility and simpler rendering
      const html = editor.getHTML()
      onChange?.(html)
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none p-6`,
        style: `min-height: ${minHeight}`,
        'data-placeholder': placeholder,
      },
    },
  })

  const insertLink = useCallback(() => {
    if (!editor) return

    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setLinkText('')
      setShowLinkDialog(false)
    }
  }, [editor, linkUrl])

  const insertImage = useCallback(() => {
    if (!editor) return

    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run()
      setImageUrl('')
      setImageAlt('')
      setShowImageDialog(false)
    }
  }, [editor, imageUrl, imageAlt])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }, [editor])

  const colors = [
    '#000000',
    '#374151',
    '#6B7280',
    '#9CA3AF',
    '#DC2626',
    '#EA580C',
    '#D97706',
    '#CA8A04',
    '#65A30D',
    '#16A34A',
    '#059669',
    '#0891B2',
    '#0284C7',
    '#2563EB',
    '#4F46E5',
    '#7C3AED',
    '#C026D3',
    '#DB2777',
  ]

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentContent = editor.getHTML()
      const newContent = getInitialContent()

      // Only update if content has actually changed
      if (currentContent !== newContent) {
        editor.commands.setContent(newContent, { emitUpdate: false })
      }
    }
  }, [editor, getInitialContent])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        onSave?.()
      }
    }

    if (editable && onSave) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editable, onSave])

  // Handle outside click for color dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowColorDropdown(false)
      }
    }

    if (showColorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorDropdown])

  if (!editor) {
    return (
      <div
        className={`rounded-lg border bg-background ${className}`}
        style={{ minHeight }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading editor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-background shadow-sm ${className}`}>
      {editable && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border-b bg-gradient-to-r from-gray-50 to-white p-3 backdrop-blur-sm dark:from-gray-900 dark:to-gray-800">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
              className="h-8 w-8 p-0"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
              className="h-8 w-8 p-0"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Headings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Type className="mr-1 h-4 w-4" />
                Format
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setParagraph().run()}
              >
                <FileText className="mr-2 h-4 w-4" />
                Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
              >
                <Heading1 className="mr-2 h-4 w-4" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
              >
                <Heading2 className="mr-2 h-4 w-4" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
              >
                <Heading3 className="mr-2 h-4 w-4" />
                Heading 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive('bold')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-blue-900 dark:data-[active=true]:text-blue-300"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive('italic')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-blue-900 dark:data-[active=true]:text-blue-300"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              data-active={editor.isActive('strike')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-blue-900 dark:data-[active=true]:text-blue-300"
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              data-active={editor.isActive('code')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-blue-900 dark:data-[active=true]:text-blue-300"
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Combined Text Color & Highlight */}
          <div className="relative" ref={colorDropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Text Color & Highlight"
              onClick={() => setShowColorDropdown(!showColorDropdown)}
            >
              <Palette className="h-4 w-4" />
            </Button>

            {showColorDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {/* Text Color Section */}
                <div className="mb-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <div className="h-3 w-3 rounded border border-gray-300 dark:border-gray-600"></div>
                    Text Color
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-gray-300 bg-white transition-all duration-200 hover:scale-110 dark:border-gray-600 dark:bg-gray-700"
                      onClick={() => {
                        editor.chain().focus().unsetColor().run()
                        setShowColorDropdown(false)
                      }}
                      title="Remove text color"
                    >
                      <span className="text-xs font-bold text-gray-500">×</span>
                    </button>
                    {colors.map(color => (
                      <button
                        key={`text-${color}`}
                        className="h-7 w-7 rounded-md border-2 border-gray-200 transition-all duration-200 hover:scale-110 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          editor.chain().focus().setColor(color).run()
                          setShowColorDropdown(false)
                        }}
                        title={`Set text color to ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Highlight Section */}
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <div className="h-3 w-3 rounded border border-yellow-300 bg-yellow-200"></div>
                    Highlight
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-gray-300 bg-white transition-all duration-200 hover:scale-110 dark:border-gray-600 dark:bg-gray-700"
                      onClick={() => {
                        editor.chain().focus().unsetHighlight().run()
                        setShowColorDropdown(false)
                      }}
                      title="Remove highlight"
                    >
                      <span className="text-xs font-bold text-gray-500">×</span>
                    </button>
                    {colors.map(color => (
                      <button
                        key={`highlight-${color}`}
                        className="h-7 w-7 rounded-md border-2 border-gray-200 transition-all duration-200 hover:scale-110 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          editor.chain().focus().setHighlight({ color }).run()
                          setShowColorDropdown(false)
                        }}
                        title={`Set highlight color to ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive('bulletList')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-green-100 data-[active=true]:text-green-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-green-900 dark:data-[active=true]:text-green-300"
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              data-active={editor.isActive('orderedList')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-green-100 data-[active=true]:text-green-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-green-900 dark:data-[active=true]:text-green-300"
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              data-active={editor.isActive('taskList')}
              className="h-8 w-8 p-0 hover:bg-gray-100 data-[active=true]:bg-green-100 data-[active=true]:text-green-700 dark:hover:bg-gray-700 dark:data-[active=true]:bg-green-900 dark:data-[active=true]:text-green-300"
              title="Task List"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Insert Elements */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLinkDialog(true)}
              title="Insert Link"
              className="h-8 w-8 p-0"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImageDialog(true)}
              title="Insert Image"
              className="h-8 w-8 p-0"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertTable}
              title="Insert Table"
              className="h-8 w-8 p-0"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Insert Divider"
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="More Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="mr-2 h-4 w-4" />
                Quote Block
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                <Code className="mr-2 h-4 w-4" />
                Code Block
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().clearNodes().unsetAllMarks().run()
                }
              >
                Clear Formatting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <EditorContent
        editor={editor}
        className={`prose prose-lg max-w-none focus-within:outline-none ${!editable ? 'rounded-lg' : 'rounded-b-lg'}`}
      />

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>Add a link to your document</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link-url" className="text-right">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="col-span-3"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    insertLink()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertLink}>Insert Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>Add an image to your document</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-url" className="text-right">
                URL
              </Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-alt" className="text-right">
                Alt Text
              </Label>
              <Input
                id="image-alt"
                value={imageAlt}
                onChange={e => setImageAlt(e.target.value)}
                placeholder="Image description"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertImage}>Insert Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .ProseMirror {
          padding: 1.5rem;
          min-height: ${minHeight};
          outline: none;
          font-size: 16px;
          line-height: 1.6;
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ProseMirror p {
          margin: 0.75rem 0;
        }

        .ProseMirror p:first-child {
          margin-top: 0;
        }

        .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3 {
          margin: 2rem 0 1rem 0;
          font-weight: 600;
        }

        .ProseMirror h1:first-child,
        .ProseMirror h2:first-child,
        .ProseMirror h3:first-child {
          margin-top: 0;
        }

        .ProseMirror h1 {
          font-size: 2rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }

        .ProseMirror h2 {
          font-size: 1.5rem;
        }

        .ProseMirror h3 {
          font-size: 1.25rem;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror ul ul {
          list-style-type: circle;
        }

        .ProseMirror ul ul ul {
          list-style-type: square;
        }

        .ProseMirror li {
          margin: 0.5rem 0;
          display: list-item;
        }

        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          margin: 1.5rem 0;
          padding: 0.5rem 0 0.5rem 1rem;
          background-color: #f8fafc;
          color: #64748b;
          font-style: italic;
        }

        .ProseMirror pre {
          background-color: #1e293b;
          color: #e2e8f0;
          border-radius: 6px;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .ProseMirror code {
          background-color: #f1f5f9;
          color: #e11d48;
          border-radius: 4px;
          padding: 0.2rem 0.4rem;
          font-size: 0.875rem;
        }

        .ProseMirror pre code {
          background: none;
          color: inherit;
          padding: 0;
        }

        .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
        }

        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }

        .ProseMirror th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        .ProseMirror hr {
          margin: 2rem 0;
          border: none;
          border-top: 1px solid #e2e8f0;
        }

        .ProseMirror ul[data-type='taskList'] {
          list-style: none;
          padding: 0;
        }

        .ProseMirror ul[data-type='taskList'] li {
          display: flex;
          align-items: flex-start;
        }

        .ProseMirror ul[data-type='taskList'] li > label {
          margin-right: 0.5rem;
          margin-top: 0.1rem;
        }

        .ProseMirror ul[data-type='taskList'] li > div {
          flex: 1;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Text color styles */
        .ProseMirror .text-style {
          /* Ensure text color is preserved */
        }

        /* Highlight styles */
        .ProseMirror .highlight {
          border-radius: 2px;
          padding: 0.1em 0.2em;
        }

        /* Color preservation */
        .ProseMirror [style*='color'] {
          /* Ensure inline color styles are preserved */
        }
      `}</style>
    </div>
  )
}

// Export a read-only version for displaying documents
export function TiptapReader({
  content = '',
  className = '',
  minHeight = '300px',
}: {
  content?: string | object
  className?: string
  minHeight?: string
}) {
  return (
    <TiptapEditor
      content={typeof content === 'string' ? content : JSON.stringify(content)}
      editable={false}
      className={className}
      minHeight={minHeight}
    />
  )
}

// Utility function to safely extract plain text from Tiptap content
export function extractPlainText(
  content: string | object,
  maxLength = 150
): string {
  if (!content) return 'No content'

  // If content is HTML string, strip tags
  if (typeof content === 'string') {
    const plainText = content.replace(/<[^>]*>/g, '')
    return (
      plainText.substring(0, maxLength) +
      (plainText.length > maxLength ? '...' : '')
    )
  }

  // If content is JSON, extract text from nodes
  if (typeof content === 'object' && content !== null) {
    const extractTextFromNode = (node: any): string => {
      if (typeof node === 'string') return node
      if (!node) return ''

      let text = ''

      // Extract text from current node
      if (node.text) {
        text += node.text
      }

      // Recursively extract from content array
      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          text += extractTextFromNode(child)
        }
      }

      return text
    }

    const plainText = extractTextFromNode(content)
    return (
      plainText.substring(0, maxLength) +
      (plainText.length > maxLength ? '...' : '')
    )
  }

  return 'No content'
}

// Utility function to convert Tiptap JSON to HTML
export function tiptapJsonToHtml(editor: any, json: object): string {
  if (!editor || !json) return ''

  try {
    // Create a temporary editor instance to convert JSON to HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = ''

    // Use the existing editor to convert JSON to HTML
    const currentContent = editor.getJSON()
    editor.commands.setContent(json, false)
    const html = editor.getHTML()
    editor.commands.setContent(currentContent, false)

    return html
  } catch (error) {
    console.error('Error converting JSON to HTML:', error)
    return ''
  }
}
