import type { ComponentPropsWithoutRef } from 'react'
import { internalizeHref } from './links'
import { MarkdownImage } from '@/components/ui/markdown-image'

/**
 * Shared component overrides for ReactMarkdown across all body-rendering blocks.
 * Absolute links to the site's OWN production host are rewritten to
 * root-relative paths so they follow the current origin (Vercel preview before
 * launch, live domain after) — see src/lib/links.ts. Genuinely external links
 * get target=_blank + rel=noopener noreferrer plus an sr-only "opens in new
 * tab" hint. Internal links render as normal anchors. Body images render through
 * MarkdownImage, which adds a skeleton placeholder while they load.
 */
export const MD_LINK_COMPONENTS = {
  img: MarkdownImage,
  a: ({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) => {
    const { href: normalized, external } = internalizeHref(href)
    return (
      <a
        {...rest}
        href={normalized}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        {external && <span className="sr-only"> (opens in new tab)</span>}
      </a>
    )
  },
}
