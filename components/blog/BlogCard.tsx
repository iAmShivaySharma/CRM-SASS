import Link from 'next/link'
import Image from 'next/image'
import { Clock, Calendar, ArrowRight } from 'lucide-react'

interface BlogCardProps {
  title: string
  slug: string
  excerpt: string
  featuredImage: string
  featuredImageAlt: string
  publishedAt: string
  readTime: number
  category?: { name: string; slug: string }
  tags?: string[]
  author?: { name: string; avatar: string }
}

export default function BlogCard({
  title,
  slug,
  excerpt,
  featuredImage,
  featuredImageAlt,
  publishedAt,
  readTime,
  category,
  author,
}: BlogCardProps) {
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:border-primary/20">
      <Link href={`/blog/${slug}`} className="relative aspect-[16/9] overflow-hidden">
        {featuredImage ? (
          <Image
            src={featuredImage}
            alt={featuredImageAlt || title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {title.charAt(0)}
            </span>
          </div>
        )}
        {category && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            {category.name}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <time dateTime={publishedAt}>{formattedDate}</time>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {readTime} min read
          </span>
        </div>

        <Link href={`/blog/${slug}`}>
          <h2 className="mb-2 text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
            {title}
          </h2>
        </Link>

        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {excerpt}
        </p>

        <div className="flex items-center justify-between">
          {author && (
            <div className="flex items-center gap-2">
              {author.avatar ? (
                <Image
                  src={author.avatar}
                  alt={author.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {author.name.charAt(0)}
                </div>
              )}
              <span className="text-xs text-muted-foreground">{author.name}</span>
            </div>
          )}
          <Link
            href={`/blog/${slug}`}
            className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Read more
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
