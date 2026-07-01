# Fix: internal links follow the current origin (not the hardcoded live domain)

> **Audience:** an AI coding agent maintaining this template / the admin
> content-packaging pipeline, or running per-client onboarding.
>
> **Problem in one line:** packaged content links to internal pages using
> **absolute** URLs (`https://www.bblcpa.com/services`). On a Vercel preview
> those links bounce the visitor to the live production site instead of staying
> on the preview. Internal links must be **origin-relative** so they resolve
> against whatever origin serves the page — the Vercel preview URL before
> launch, the live domain after.
>
> **Date:** 2026-07-01
> **Net result:** 0 clickable links to the production host across all built
> pages; nav + body + CTA links are root-relative; canonical/OG/sitemap stay
> absolute → production. `lint` / `tsc` / `test` (221) / `build` all green.

---

## Symptom

- Some links resolved to the current deployment (the Vercel temp URL) — **these
  were already relative** (`/contact`) and behaved correctly.
- Others jumped to `https://www.bblcpa.com/...` — **these were absolute** in the
  content and broke preview navigation (and would break any pre-launch domain,
  staging, or a renamed production domain).

Root cause: the admin packager emits internal links as absolute URLs to the
firm's live domain, and the body-markdown link renderer treated every
`https://` link as external (`target="_blank"`), so same-site links both left
the current origin *and* opened a new tab.

---

## Design decision — fix at render time, not in content

Two options were considered:

1. **Rewrite all content** — strip `https://www.bblcpa.com` from ~58 files.
   Rejected: brittle, easy to miss the SEO fields that must *stay* absolute
   (`canonical_url`, OG `url`), and it does nothing for the **next** batch of
   admin-packaged content, which will have the same absolute links.
2. **Normalize at render time (chosen)** — one helper that rewrites absolute
   URLs pointing at the site's own host into root-relative paths, applied at
   every link-rendering chokepoint. Content is left as-is; future content is
   handled automatically; SEO surfaces are never touched because they don't go
   through link rendering.

**Key invariant:** SEO/meta URLs (`canonical_url`, OpenGraph `url`, `sitemap`,
`feed.xml`) must remain **absolute and point at production**. They are built
from `siteConfig.siteUrl` + slug and deliberately bypass the link normalizer.
Only *clickable* links are made relative.

---

## What changed

### New files

**`src/lib/links.ts`** — the single source of truth. `internalizeHref(href)`:

- Derives the site's own host from `siteConfig.siteUrl`
  (`https://www.bblcpa.com` → `bblcpa.com`), normalizing away `www.` so both
  apex and `www` forms count as internal.
- Rewrites absolute http(s) URLs on that host to `pathname + search + hash`
  (e.g. `https://www.bblcpa.com/what-we-do/tax` → `/what-we-do/tax`).
- Leaves already-relative hrefs, fragments (`#`), queries (`?`), and non-web
  schemes (`mailto:`, `tel:`) alone.
- Returns `{ href, external }`; `external` is true only for a *different* host,
  so callers can add `target="_blank" rel="noopener noreferrer"`.

```ts
export function internalizeHref(href: string | null | undefined): {
  href: string; external: boolean
}
```

**`src/components/ui/smart-link.tsx`** — `SmartLink`, a drop-in `next/link`
replacement that runs `internalizeHref` on its `href`, then renders `<NextLink>`
(adding `target=_blank` + `rel` when external). Blocks import it aliased as
`Link`, so existing `<Link href=…>` call sites are unchanged.

### Edited files — the three link-rendering chokepoints

1. **Body markdown** — `src/lib/markdown-components.tsx`
   (`MD_LINK_COMPONENTS.a`) now calls `internalizeHref`. This one component is
   used by every prose block (ContentProse, IntroText, ContentSplit, CtaBanner,
   FaqAccordion, TeamGrid, ProcessSteps, ContentCards, InlineProse, the
   resources post renderer, …), so all body links are covered at once.

2. **Nav** — `src/lib/nav/get-nav-config.ts` normalizes every URL in
   `nav.json` (`primary[].url`, nested `children[].url`, and `cta.url`) at load
   time. Because `getNavConfig()` is the single loader, `NavBar`, `MobileNav`,
   and `Footer` all receive relative URLs — **no edits needed in those
   components**. Bonus: `NavBar`'s active-state check
   (`isUrlActive(pathname, item.url)`) compares against `usePathname()`, which
   is relative — so relative nav URLs also fix nav highlighting that silently
   broke when URLs were absolute.

3. **Block CTAs / cards** — 15 block components that render content-derived
   URLs directly via `next/link` had their import swapped from
   `import Link from 'next/link'` to
   `import { SmartLink as Link } from '@/components/ui/smart-link'`:

   ```
   Hero, HeroSplit, Pricing, ProcessSteps, ServiceCards, IndustryCards,
   ContentCards, ContentSplit, CtaBanner, ChecklistSection, IntroText,
   ResourceList, LogoBar, RelatedLinks, PageHeader
   ```

   (`RelatedLinks` renders the `internal_links` frontmatter; `PageHeader`
   renders breadcrumbs; `LogoBar`/`ResourceList` may carry genuinely external
   URLs, which `SmartLink` correctly leaves absolute + `target=_blank`.)

### NOT changed (on purpose)

- `src/app/sitemap.ts`, canonical/OG in `src/app/page.tsx` and the
  `[...slug]` route — all built from `siteConfig.siteUrl`; must stay absolute.
- `content/**` — no content was edited; the frontmatter `url:` /
  `canonical_url:` absolute values are left intact (routing is filename-based;
  canonical intentionally absolute).

---

## Exact edits (for replay)

```ts
// src/lib/markdown-components.tsx
- const external = href?.startsWith('http://') || href?.startsWith('https://')
- <a {...rest} href={href} {...(external ? {target:'_blank', rel:'noopener noreferrer'} : {})}>
+ import { internalizeHref } from './links'
+ const { href: normalized, external } = internalizeHref(href)
+ <a {...rest} href={normalized} {...(external ? {target:'_blank', rel:'noopener noreferrer'} : {})}>
```

```ts
// src/lib/nav/get-nav-config.ts — normalize on load
import { internalizeHref } from '@/lib/links'
const normalizeItem = (i: NavItem): NavItem => ({
  ...i, url: internalizeHref(i.url).href, children: i.children?.map(normalizeItem),
})
// return { ...nav, primary: nav.primary.map(normalizeItem),
//          cta: nav.cta ? { ...nav.cta, url: internalizeHref(nav.cta.url).href } : nav.cta }
```

```bash
# 15 block components — uniform import swap
for f in $(grep -rl "^import Link from 'next/link'" src/components/blocks/); do
  perl -i -pe 's{^import Link from \x27next/link\x27$}{import { SmartLink as Link } from \x27@/components/ui/smart-link\x27}' "$f"
done
```

---

## Verification

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build   # all green (221 tests, exit 0)

# No clickable link to the production host in ANY built page → 0
find .next/server/app -name '*.html' -print0 \
  | xargs -0 grep -hoE '<a [^>]*href="https://(www\.)?bblcpa\.com[^"]*"' | wc -l   # → 0

# Internal links are now relative
grep -oE 'href="/[a-z][^"]*"' .next/server/app/index.html | head
#   href="/who-we-are"  href="/what-we-do/outsourced-accounting"  href="/contact" …

# SEO stays absolute → production (must remain non-empty)
grep -oE 'rel="canonical" href="[^"]*"' .next/server/app/index.html
#   rel="canonical" href="https://www.bblcpa.com"

# Genuinely external links still open in a new tab
find .next/server/app -name '*.html' -print0 \
  | xargs -0 grep -hoE 'href="https://[^"]+"[^>]*target="_blank"' | grep -v bblcpa | head
#   href="https://www.facebook.com/…" target="_blank"
```

---

## How this maps back to `siteConfig.siteUrl`

`internalizeHref` treats a URL as internal iff its host matches
`siteConfig.siteUrl`'s host (apex or www). So:

- Before launch, `siteUrl` is already `https://www.bblcpa.com`; the site is
  deployed at a Vercel `*.vercel.app` URL. Content links to `www.bblcpa.com`
  become relative → they stay on the Vercel preview. ✅
- After launch on `www.bblcpa.com`, the same relative links resolve to the live
  domain. ✅
- If `siteUrl` is a placeholder (e.g. `https://example.com`) during early
  onboarding, only `example.com` links would be internalized — set `siteUrl` to
  the firm's real domain so its content links get normalized. (This is already
  step 3/4 of `docs/setup.md`.)

---

## Recommendations for the template & admin packager

1. **Bake this into the template** (it now is): `internalizeHref` + `SmartLink`
   as the standard link path. Any new block that renders a content URL should
   import `SmartLink as Link`, not `next/link`, so it inherits this behavior.
   Consider an ESLint rule banning `import Link from 'next/link'` inside
   `src/components/blocks/**` to enforce it.

2. **Better: emit relative internal links at packaging time.** The admin
   packager already knows the firm's origin — it should write internal links as
   root-relative (`/services`) and reserve absolute URLs for the SEO fields
   (`canonical_url`, OG). That makes the content portable across preview/staging
   /production by construction. The render-time normalizer then becomes a
   safety net rather than the primary fix.

3. **Keep SEO absolute.** Whatever the packager does, `canonical_url` and OG
   `url` must stay absolute → production. Do not relativize those.
