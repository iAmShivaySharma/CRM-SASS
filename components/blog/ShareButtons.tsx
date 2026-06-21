'use client'

import { useState } from 'react'
import { Share2, Twitter, Linkedin, Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  url: string
  title: string
  description: string
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDesc = encodeURIComponent(description)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const platforms = [
    {
      name: 'Twitter',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Share2 className="h-4 w-4" />
        Share
      </span>
      {platforms.map(platform => (
        <a
          key={platform.name}
          href={platform.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${platform.name}`}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <platform.icon className="h-4 w-4" />
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Copy link"
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
