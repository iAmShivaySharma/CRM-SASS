'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Code, Save, Undo, Redo,
  Type, AlignLeft, AlignCenter, AlignRight, Link, CheckSquare, Square,
  Heading1, Heading2, Heading3, Palette, Image, Table, Minus, Plus,
  MoreHorizontal, FileText, Hash, Strikethrough
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

interface RichTextEditorProps {
  content?: string | any[]
  onChange?: (content: any[]) => void
  onSave?: () => void
  editable?: boolean
  placeholder?: string
  className?: string
}

export function BlockEditor({
  content = '',
  onChange,
  onSave,
  editable = true,
  placeholder = 'Start writing...',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [selectedText, setSelectedText] = useState('')

  // Convert content to HTML string
  const getContentAsHtml = useCallback(() => {
    if (typeof content === 'string') {
      return content
    }
    if (Array.isArray(content) && content.length > 0) {
      // Convert block content to HTML
      return content.map(block => {
        if (typeof block === 'string') return block
        if (block.type === 'paragraph') return `<p>${block.content || ''}</p>`
        if (block.type === 'heading') return `<h${block.level || 2}>${block.content || ''}</h${block.level || 2}>`
        if (block.type === 'list') return `<ul><li>${block.content || ''}</li></ul>`
        return block.content || ''
      }).join('')
    }
    return ''
  }, [content])

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editable) {
      const htmlContent = getContentAsHtml()
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent
      }
    }
  }, [getContentAsHtml, editable])

  const execCommand = useCallback((command: string, value?: string) => {
    if (!editable) return
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [editable])

  const handleInput = useCallback(() => {
    if (!onChange || !editorRef.current) return

    const htmlContent = editorRef.current.innerHTML
    // Convert HTML back to blocks format
    const blocks = [{
      type: 'paragraph',
      content: htmlContent
    }]
    onChange(blocks)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      onSave?.()
    }

    // Enhanced Tab support for nested lists
    if (e.key === 'Tab') {
      e.preventDefault()
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const listItem = range.startContainer.parentElement?.closest('li')

        if (listItem) {
          if (e.shiftKey) {
            // Outdent - move to parent level
            execCommand('outdent')
          } else {
            // Indent - create nested list
            execCommand('indent')
          }
        } else {
          // Regular indentation for non-list items
          if (e.shiftKey) {
            execCommand('outdent')
          } else {
            execCommand('indent')
          }
        }
      }
    }

    // Enter key handling for lists
    if (e.key === 'Enter') {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const listItem = range.startContainer.parentElement?.closest('li')

        if (listItem && listItem.textContent?.trim() === '') {
          // Empty list item - outdent or exit list
          e.preventDefault()
          execCommand('outdent')
        }
      }
    }
  }, [onSave, execCommand])

  const insertLink = useCallback(() => {
    if (linkUrl && linkText) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const link = document.createElement('a')
        link.href = linkUrl
        link.textContent = linkText
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.className = 'text-blue-600 hover:text-blue-800 underline'
        range.insertNode(link)
      }
      setLinkUrl('')
      setLinkText('')
      setShowLinkDialog(false)
      handleInput()
    }
  }, [linkUrl, linkText])

  const insertCheckbox = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)

      // Create checklist item container
      const checklistItem = document.createElement('div')
      checklistItem.className = 'checklist-item'

      // Create checkbox
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'mr-2 rounded'
      checkbox.addEventListener('change', () => {
        const textSpan = checkbox.nextElementSibling as HTMLElement
        if (textSpan) {
          if (checkbox.checked) {
            textSpan.style.textDecoration = 'line-through'
            textSpan.style.opacity = '0.6'
          } else {
            textSpan.style.textDecoration = 'none'
            textSpan.style.opacity = '1'
          }
        }
        handleInput()
      })

      // Create text span
      const textSpan = document.createElement('span')
      textSpan.contentEditable = 'true'
      textSpan.textContent = 'Add your task here'
      textSpan.className = 'flex-1 outline-none'

      checklistItem.appendChild(checkbox)
      checklistItem.appendChild(textSpan)

      // Insert the checklist item
      const lineBreakBefore = document.createElement('br')
      const lineBreakAfter = document.createElement('br')

      range.insertNode(lineBreakAfter)
      range.insertNode(checklistItem)
      range.insertNode(lineBreakBefore)

      // Focus on the text span
      const newRange = document.createRange()
      newRange.selectNodeContents(textSpan)
      selection.removeAllRanges()
      selection.addRange(newRange)

      handleInput()
    }
  }, [handleInput])

  const insertDivider = useCallback(() => {
    const hr = document.createElement('hr')
    hr.className = 'my-6 border-t border-gray-300'
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.insertNode(hr)
      handleInput()
    }
  }, [])

  const insertImage = useCallback(() => {
    if (imageUrl && imageAlt) {
      const img = document.createElement('img')
      img.src = imageUrl
      img.alt = imageAlt
      img.className = 'max-w-full h-auto my-4 rounded-lg shadow-sm'
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.insertNode(img)
        handleInput()
      }
      setImageUrl('')
      setImageAlt('')
      setShowImageDialog(false)
    }
  }, [imageUrl, imageAlt])

  const insertTable = useCallback(() => {
    const table = document.createElement('table')
    table.className = 'border-collapse border border-gray-300 w-full my-4'

    for (let i = 0; i < 3; i++) {
      const row = document.createElement('tr')
      for (let j = 0; j < 3; j++) {
        const cell = document.createElement(i === 0 ? 'th' : 'td')
        cell.className = 'border border-gray-300 px-4 py-2'
        cell.textContent = i === 0 ? `Header ${j + 1}` : `Cell ${i}-${j + 1}`
        if (i === 0) cell.className += ' bg-gray-50 font-semibold'
        row.appendChild(cell)
      }
      table.appendChild(row)
    }

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.insertNode(table)
      handleInput()
    }
  }, [])

  const formatHeading = useCallback((level: number) => {
    execCommand('formatBlock', `h${level}`)
    handleInput()
  }, [])

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setSelectedText(selection.toString())
    }
  }, [])

  const applyTextColor = useCallback((color: string) => {
    execCommand('foreColor', color)
    handleInput()
  }, [])

  const applyBackgroundColor = useCallback((color: string) => {
    execCommand('backColor', color)
    handleInput()
  }, [])

  const formatButtons = [
    { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
    { icon: Strikethrough, command: 'strikeThrough', title: 'Strikethrough' },
  ]

  const alignButtons = [
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
  ]

  const colors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF', '#DC2626', '#EA580C',
    '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#059669', '#0891B2',
    '#0284C7', '#2563EB', '#4F46E5', '#7C3AED', '#C026D3', '#DB2777'
  ]

  const toolbarButtons = [
    { icon: Undo, command: 'undo', title: 'Undo (Ctrl+Z)' },
    { icon: Redo, command: 'redo', title: 'Redo (Ctrl+Y)' },
  ]

  return (
    <div className={`bg-background ${className}`}>
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            {toolbarButtons.map(({ icon: Icon, command, title }) => (
              <Button
                key={command}
                variant="ghost"
                size="sm"
                onClick={() => execCommand(command)}
                title={title}
                className="h-8 w-8 p-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Headings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Type className="h-4 w-4 mr-1" />
                Heading
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => formatHeading(1)}>
                <Heading1 className="mr-2 h-4 w-4" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatHeading(2)}>
                <Heading2 className="mr-2 h-4 w-4" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatHeading(3)}>
                <Heading3 className="mr-2 h-4 w-4" />
                Heading 3
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'p')}>
                <FileText className="mr-2 h-4 w-4" />
                Normal Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            {formatButtons.map(({ icon: Icon, command, title }) => (
              <Button
                key={command}
                variant="ghost"
                size="sm"
                onClick={() => execCommand(command)}
                title={title}
                className="h-8 w-8 p-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Color */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="grid grid-cols-6 gap-1 p-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyTextColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Background Color */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Background Color">
                <div className="h-4 w-4 bg-yellow-200 border rounded-sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="grid grid-cols-6 gap-1 p-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyBackgroundColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <List className="h-4 w-4 mr-1" />
                Lists
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => execCommand('insertUnorderedList')}>
                <List className="mr-2 h-4 w-4" />
                Bullet List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('insertOrderedList')}>
                <ListOrdered className="mr-2 h-4 w-4" />
                Numbered List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertCheckbox}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Checklist Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment */}
          <div className="flex items-center gap-1">
            {alignButtons.map(({ icon: Icon, command, title }) => (
              <Button
                key={command}
                variant="ghost"
                size="sm"
                onClick={() => execCommand(command)}
                title={title}
                className="h-8 w-8 p-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
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
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImageDialog(true)}
              title="Insert Image"
              className="h-8 w-8 p-0"
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertTable}
              title="Insert Table"
              className="h-8 w-8 p-0"
            >
              <Table className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertDivider}
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
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'blockquote')}>
                <Quote className="mr-2 h-4 w-4" />
                Quote Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'pre')}>
                <Code className="mr-2 h-4 w-4" />
                Code Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('removeFormat')}>
                Clear Formatting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Button */}
          <div className="ml-auto">
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                title="Save (Ctrl+S)"
                className="h-8 ml-2"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={editable}
        className="min-h-[500px] p-6 focus:outline-none w-full max-w-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight: '500px',
          lineHeight: '1.6',
          width: '100%',
          maxWidth: 'none',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
        dangerouslySetInnerHTML={!editable ? { __html: getContentAsHtml() } : undefined}
      />

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a link to your document
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link-text" className="text-right">
                Text
              </Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link-url" className="text-right">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="col-span-3"
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
            <DialogDescription>
              Add an image to your document
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-url" className="text-right">
                URL
              </Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
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
                onChange={(e) => setImageAlt(e.target.value)}
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

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
          pointer-events: none;
        }

        [contenteditable] {
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        [contenteditable]:focus {
          outline: none;
        }

        [contenteditable] * {
          max-width: 100%;
        }

        [contenteditable] h1,
        [contenteditable] h2,
        [contenteditable] h3,
        [contenteditable] h4,
        [contenteditable] h5,
        [contenteditable] h6 {
          font-weight: 600;
          margin: 1.5em 0 0.5em 0;
          line-height: 1.3;
          color: inherit;
        }

        [contenteditable] h1:first-child,
        [contenteditable] h2:first-child,
        [contenteditable] h3:first-child {
          margin-top: 0;
        }

        [contenteditable] h1 {
          font-size: 2em;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.3em;
        }

        [contenteditable] h2 {
          font-size: 1.5em;
        }

        [contenteditable] h3 {
          font-size: 1.25em;
        }

        [contenteditable] p {
          margin: 0.75em 0;
          line-height: 1.6;
        }

        [contenteditable] p:first-child {
          margin-top: 0;
        }

        [contenteditable] p:last-child {
          margin-bottom: 0;
        }

        [contenteditable] br {
          line-height: 1.6;
        }

        [contenteditable] blockquote {
          border-left: 4px solid #3b82f6;
          margin: 1em 0;
          padding: 0.5em 0 0.5em 1em;
          background-color: #f8fafc;
          color: #64748b;
          font-style: italic;
          border-radius: 0 4px 4px 0;
        }

        [contenteditable] pre {
          background-color: #1e293b;
          color: #e2e8f0;
          padding: 1em;
          border-radius: 6px;
          margin: 1em 0;
          overflow-x: auto;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875em;
          line-height: 1.5;
          white-space: pre;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          margin: 1em 0;
          padding-left: 2em;
        }

        [contenteditable] ul ul,
        [contenteditable] ol ol,
        [contenteditable] ul ol,
        [contenteditable] ol ul {
          margin: 0.5em 0;
        }

        [contenteditable] li {
          margin: 0.25em 0;
          line-height: 1.5;
        }

        [contenteditable] code {
          background-color: #f1f5f9;
          color: #e11d48;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875em;
        }

        [contenteditable] table {
          border-collapse: collapse;
          margin: 1em 0;
          width: 100%;
          font-size: 0.9em;
        }

        [contenteditable] th,
        [contenteditable] td {
          border: 1px solid #d1d5db;
          padding: 0.5em 0.75em;
          text-align: left;
        }

        [contenteditable] th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        [contenteditable] img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        [contenteditable] hr {
          margin: 2em 0;
          border: none;
          border-top: 1px solid #e2e8f0;
        }

        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
          text-decoration-color: #93c5fd;
          transition: all 0.2s ease;
        }

        [contenteditable] a:hover {
          color: #1d4ed8;
          text-decoration-color: #2563eb;
        }

        [contenteditable] .checklist-item {
          display: flex;
          align-items: flex-start;
          margin: 0.5em 0;
          line-height: 1.5;
        }

        [contenteditable] .checklist-item input[type="checkbox"] {
          margin: 0.1em 0.5em 0 0;
          transform: scale(1.1);
          cursor: pointer;
        }

        [contenteditable] .checklist-item span {
          flex: 1;
        }

        [contenteditable] strong,
        [contenteditable] b {
          font-weight: 600;
        }

        [contenteditable] em,
        [contenteditable] i {
          font-style: italic;
        }

        [contenteditable] u {
          text-decoration: underline;
        }

        [contenteditable] s,
        [contenteditable] strike {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  )
}

// Export a read-only version for displaying documents
export function BlockReader({
  content = '',
  className = '',
}: {
  content?: string | any[]
  className?: string
}) {
  return (
    <BlockEditor
      content={content}
      editable={false}
      className={className}
    />
  )
}