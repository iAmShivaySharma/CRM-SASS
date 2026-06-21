import Link from 'next/link'
import { FileX } from 'lucide-react'

export default function BlogNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <FileX className="mb-4 h-16 w-16 text-muted-foreground/40" />
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Blog Post Not Found
      </h1>
      <p className="mb-6 text-muted-foreground">
        The article you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/blog"
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Browse All Articles
      </Link>
    </div>
  )
}
