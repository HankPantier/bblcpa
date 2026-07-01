import { siteConfig } from '../../site.config'

/**
 * The site's own production hostname, normalized without a leading `www.`.
 * Derived from `siteConfig.siteUrl` (e.g. https://www.bblcpa.com → bblcpa.com).
 * Returns null if siteUrl is unparseable (e.g. a placeholder).
 */
function selfHost(): string | null {
  try {
    return new URL(siteConfig.siteUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

export type NormalizedHref = {
  /** The href to render. Same-site absolute URLs are rewritten to root-relative. */
  href: string
  /** True only for genuinely external http(s) links (different host). */
  external: boolean
}

/**
 * Normalize an href so that internal navigation always follows the CURRENT
 * origin instead of hard-jumping to the firm's production domain.
 *
 * Content is authored (and admin-packaged) with absolute links to the live
 * site, e.g. `https://www.bblcpa.com/services`. On a Vercel preview those
 * links would bounce the visitor to production. This rewrites any absolute URL
 * whose host matches the site's own production host (apex or `www.`) to a
 * root-relative path (`/services`), which the browser resolves against whatever
 * origin is serving the page — the Vercel preview URL before launch, the live
 * domain after.
 *
 * - Already-relative hrefs (`/x`, `#x`, `?x`) pass through as internal.
 * - `mailto:` / `tel:` and other non-http schemes pass through, not external.
 * - Absolute http(s) URLs to a DIFFERENT host pass through and are marked
 *   external (callers add target=_blank + rel=noopener).
 *
 * NOTE: SEO / meta URLs (canonical_url, OpenGraph url, sitemap entries) must
 * stay absolute and point at production. They are built from
 * `siteConfig.siteUrl` and deliberately do NOT go through this helper.
 */
export function internalizeHref(href: string | null | undefined): NormalizedHref {
  if (!href) return { href: href ?? '', external: false }

  // Root-relative, fragment-only, or query-only: already internal.
  if (href.startsWith('/') && !href.startsWith('//')) return { href, external: false }
  if (href.startsWith('#') || href.startsWith('?')) return { href, external: false }

  let url: URL
  try {
    url = new URL(href)
  } catch {
    // Not a parseable absolute URL (e.g. a bare relative path). Leave as-is.
    return { href, external: false }
  }

  // Non-web schemes (mailto:, tel:, etc.) — leave alone, don't mark external.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { href, external: false }
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const self = selfHost()
  if (self && host === self) {
    // Same site → make it origin-relative so it follows the current deployment.
    return { href: (url.pathname || '/') + url.search + url.hash, external: false }
  }

  return { href, external: true }
}
