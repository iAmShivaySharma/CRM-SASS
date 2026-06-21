'use client'

interface BlogContentProps {
  content: string
}

export default function BlogContent({ content }: BlogContentProps) {
  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-none
        prose-headings:scroll-mt-20 prose-headings:font-bold
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:leading-relaxed prose-p:text-muted-foreground
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-xl prose-img:shadow-md
        prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm
        prose-pre:rounded-xl prose-pre:bg-muted
        prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
        prose-li:text-muted-foreground
        prose-strong:text-foreground
        prose-table:overflow-hidden prose-table:rounded-lg prose-table:border
        prose-th:bg-muted prose-th:p-3
        prose-td:p-3 prose-td:border-t"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
