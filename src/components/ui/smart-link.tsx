import NextLink from 'next/link'
import type { ComponentProps } from 'react'
import { internalizeHref } from '@/lib/links'

type SmartLinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string }

/**
 * Drop-in replacement for `next/link` that keeps internal navigation on the
 * current origin. Absolute URLs pointing at the site's own production host
 * (see `siteConfig.siteUrl`) are rewritten to root-relative paths, so links
 * follow whatever origin serves the page — the Vercel preview URL before
 * launch, the live domain after. Genuinely external links pass through and get
 * `target="_blank"` + `rel="noopener noreferrer"`.
 *
 * Blocks import this as `Link` (aliased) so existing `<Link href=…>` call
 * sites are unchanged. SEO/meta URLs do NOT use this — see src/lib/links.ts.
 */
export function SmartLink({ href, ...rest }: SmartLinkProps) {
  const { href: normalized, external } = internalizeHref(href)
  const externalProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' as const }
    : {}
  return <NextLink href={normalized} {...externalProps} {...rest} />
}
