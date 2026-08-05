'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { Search, X } from 'lucide-react'

interface EmailSearchProps {
  onSearch: (value: string) => void
  placeholder?: string
}

export const EmailSearch = memo(function EmailSearch({
  onSearch,
  placeholder = 'Search emails...',
}: EmailSearchProps) {
  const [query, setQuery] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        dir="ltr"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex h-8 w-full rounded-md border border-input bg-background py-2 pl-10 pr-10 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ textAlign: 'left', direction: 'ltr' }}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
})
