import type { ComponentPropsWithoutRef } from 'react'
import { internalizeHref } from './links'

/**
 * Shared link renderer for ReactMarkdown across all body-rendering blocks.
 * Absolute links to the site's OWN production host are rewritten to
 * root-relative paths so they follow the current origin (Vercel preview before
 * launch, live domain after) — see src/lib/links.ts. Genuinely external links
 * get target=_blank + rel=noopener noreferrer plus an sr-only "opens in new
 * tab" hint. Internal links render as normal anchors.
 */
export const MD_LINK_COMPONENTS = {
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
