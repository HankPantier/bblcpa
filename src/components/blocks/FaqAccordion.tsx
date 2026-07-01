import { Section } from './Section'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { FaqAccordionClient } from './FaqAccordionClient'
import type { FaqAccordionProps } from '@/lib/assembly/extract-block-props'

export type { FaqAccordionProps }

/**
 * FaqAccordion (server wrapper) — pre-renders each answer's markdown into a
 * React node so the interactive <FaqAccordionClient> does not ship
 * react-markdown / remark-gfm in its client bundle.
 */
export function FaqAccordion({ heading, items }: FaqAccordionProps) {
  if (!items || items.length === 0) return null

  const renderedItems = items.map((item) => ({
    question: item.question,
    answer: (
      <div className="prose prose-neutral max-w-none prose-p:my-2 prose-a:text-primary prose-a:underline">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>
          {item.answer}
        </ReactMarkdown>
      </div>
    ),
  }))

  return (
    <Section dataBlock="faq-accordion">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-center text-foreground">
          {heading}
        </h2>
        <FaqAccordionClient items={renderedItems} />
      </div>
    </Section>
  )
}
