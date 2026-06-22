'use client'

import { useEffect, useState } from 'react'
import { List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  items: TocItem[]
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (!items.length) return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px', threshold: 0.1 }
    )

    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [items])

  if (!items.length) return null

  return (
    <nav
      aria-label="Table of Contents"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <List className="h-4 w-4" />
        Table of Contents
      </h3>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
          >
            <a
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault()
                document
                  .getElementById(item.id)
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={cn(
                'block text-sm leading-relaxed transition-colors',
                activeId === item.id
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
