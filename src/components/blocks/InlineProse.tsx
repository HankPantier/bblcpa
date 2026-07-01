import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Renders a short markdown string through ReactMarkdown with shared link
 * handling (external rel/target + a11y hint). Designed for short prose
 * fields that the Phase I content generator commonly decorates with
 * **bold**, *italic*, or [link](url) syntax:
 *
 *   - Block-level intros ("Our team has 25+ years of experience helping...")
 *   - Checklist items ("**Annual Tax Preparation Checklist** — a list of...")
 *   - Pricing disclaimers, etc.
 *
 * The wrapper is a <div className="prose max-w-none"> so baseline paragraph
 * styles from globals.css apply (vertical rhythm, list bullets, link
 * underlines). The `prose` class shrinks to a single paragraph because
 * :last-child margins are zeroed.
 */
export function InlineProse({
  text,
  className,
  ...rest
}: { text: string; className?: string } & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) {
  return (
    <div className={cn('prose max-w-none', className)} {...rest}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{text}</ReactMarkdown>
    </div>
  )
}
