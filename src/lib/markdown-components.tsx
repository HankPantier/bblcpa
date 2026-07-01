import type { ComponentPropsWithoutRef } from 'react'

/**
 * Shared link renderer for ReactMarkdown across all body-rendering blocks.
 * Anchors get target=_blank + rel=noopener noreferrer when href is absolute
 * (http/https), plus an sr-only "opens in new tab" hint. Internal links
 * (starting with /) render as normal anchors.
 */
export const MD_LINK_COMPONENTS = {
  a: ({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) => {
    const external = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a
        {...rest}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        {external && <span className="sr-only"> (opens in new tab)</span>}
      </a>
    )
  },
}
