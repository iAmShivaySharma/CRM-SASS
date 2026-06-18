import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-8 py-16 text-center sm:px-16 lg:py-20">
        {/* circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />

        <div className="relative z-10">
          <h2 className="mx-auto max-w-lg text-3xl font-bold text-white sm:text-4xl">
            Ready to consolidate your tool stack?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-blue-100">
            Join 10,000+ teams who replaced 6 subscriptions with one.
            Start free today — upgrade only when you&apos;re ready.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 rounded-lg bg-white px-7 text-[15px] font-semibold text-blue-600 hover:bg-blue-50">
              <Link href="/register">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 rounded-lg border border-white/20 px-7 text-[15px] font-semibold text-white hover:bg-white/10">
              <a href="#calculator">See pricing</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
