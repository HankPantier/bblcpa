'use client'

import type { ReactNode } from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger,
} from '@/components/ui/accordion'

/**
 * Interactive shell for the FAQ block. The server-side `FaqAccordion` wrapper
 * pre-renders each answer's markdown into `answer` (a ReactNode) so this
 * component does not ship react-markdown / remark-gfm in its bundle.
 */
type FaqAccordionItem = { question: string; answer: ReactNode }

export function FaqAccordionClient({ items }: { items: FaqAccordionItem[] }) {
  return (
    <Accordion type="single" collapsible className="mt-10 w-full">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-left font-heading text-base md:text-lg m-0">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-foreground/80 leading-relaxed">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
