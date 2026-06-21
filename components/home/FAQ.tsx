import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQS } from './constants'

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 lg:py-32">
      <div className="mb-12 text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-primary">FAQ</p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Common questions
        </h2>
      </div>

      <Accordion type="single" collapsible defaultValue="item-0">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-border">
            <AccordionTrigger className="text-[15px] font-semibold text-foreground hover:no-underline [&[data-state=open]]:text-primary">
              {f.question}
            </AccordionTrigger>
            <AccordionContent className="text-[14px] leading-relaxed text-muted-foreground">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
