import Link from 'next/link'
import Image from 'next/image'
import { Clock } from 'lucide-react'

interface RelatedPost {
  title: string
  slug: string
  excerpt: string
  featuredImage: string
  featuredImageAlt: string
  publishedAt: string
  readTime: number
}

interface RelatedPostsProps {
  posts: RelatedPost[]
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  if (!posts.length) return null

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="mb-8 text-2xl font-bold text-foreground">Related Articles</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md hover:border-primary/20"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              {post.featuredImage ? (
                <Image
                  src={post.featuredImage}
                  alt={post.featuredImageAlt || post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-2xl font-bold text-muted-foreground/30">
                    {post.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="mb-1.5 text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
                {post.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {post.readTime} min read
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
