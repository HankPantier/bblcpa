import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { InlineProse } from './InlineProse'
import { FormFields } from './FormFields'
import type { FormProps } from '@/lib/assembly/extract-block-props'

export type { FormProps }

/**
 * Form (server wrapper) — pre-renders the optional markdown `intro` and
 * `sidebar_content` strings into React nodes so the interactive
 * <FormFields> client component does not need to ship react-markdown
 * / remark-gfm / InlineProse in its bundle.
 *
 * The newsletter and main variants use different intro container classes,
 * so both pre-rendered intro nodes are computed up front and the right
 * one is passed in (the other variant simply ignores it inside FormFields
 * — only one ever renders per invocation, and React skips work on the
 * other entirely via the variant === 'newsletter' branch).
 */
export function Form(props: FormProps) {
  const { variant, intro, sidebar_content } = props

  const introNode = intro
    ? variant === 'newsletter'
      ? <InlineProse text={intro} className="text-foreground/70 mb-6" />
      : <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
    : undefined

  const sidebarNode = sidebar_content
    ? (
      <div className="prose prose-sm max-w-none text-foreground/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>
          {sidebar_content}
        </ReactMarkdown>
      </div>
    )
    : undefined

  return (
    <FormFields
      variant={props.variant}
      heading={props.heading}
      success_message={props.success_message}
      customFields={props.customFields}
      introNode={introNode}
      sidebarNode={sidebarNode}
    />
  )
}
