'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { Search, X } from 'lucide-react'

interface EmailSearchProps {
  onSearch: (value: string) => void
  placeholder?: string
}

export const EmailSearch = memo(function EmailSearch({ onSearch, placeholder = 'Search emails...' }: EmailSearchProps) {
  const [query, setQuery] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearch(val), 400)
  }

  const handleClear = () => {
    setQuery('')
    if (timerRef.current) clearTimeout(timerRef.current)
    onSearch('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        dir="ltr"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex h-8 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ textAlign: 'left', direction: 'ltr' }}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
})