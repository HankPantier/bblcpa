# Analytics + Cookie Consent — Design Spec

**Date:** 2026-05-22
**Branch:** `refactor/forms-and-social-icons` (continuing work in same session)

## Context

The per-client Next.js 16 template currently has no analytics. Clients (US-based accounting firms) want basic visitor tracking via GA4, with some clients preferring GTM so their marketing person can wire additional tags (Meta Pixel, LinkedIn Insight, etc.) without code changes. The template ships with cookie consent enabled by default for legal safety; per-client visual styling of the banner flows through the existing design-handoff pipeline that already covers navbar + footer.

## Requirements

1. Support **GA4 (G-XXXXXXXXXX)** OR **GTM (GTM-XXXXXX)** per client, configured via env vars. If both are set, GTM wins.
2. Tracking scripts do not fire until the visitor accepts via the consent banner.
3. Decision (accept/decline) persists in a long-lived cookie; banner does not re-appear next visit.
4. Visitor can withdraw consent later (GDPR requirement when banner is present).
5. When neither env var is set, no scripts and no banner — the template is dark by default.
6. Brand-specific banner styling flows through the existing `content/design-overrides.css` workflow, with the banner captured in the design brief alongside navbar + footer.
7. Banner outer element exposes `data-component="cookie-consent"` and named child slots so Claude.ai Design can target precisely without inspecting our internals.

## Configuration

Two new env vars (`NEXT_PUBLIC_` prefix → Next inlines them into the client bundle at build):

| Var | Value | Behavior |
|---|---|---|
| `NEXT_PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | Loads GA4 via `@next/third-parties/google` `<GoogleAnalytics>` after consent. |
| `NEXT_PUBLIC_GTM_ID` | `GTM-XXXXXX` | Loads GTM via `@next/third-parties/google` `<GoogleTagManager>` after consent. Wins over GA4 when both are set. |

Behavior matrix:

| GA4_ID | GTM_ID | Result |
|---|---|---|
| set | unset | GA4 loads on accept |
| unset | set | GTM loads on accept |
| set | set | GTM loads on accept (GA4 ignored — wire GA4 inside GTM if needed) |
| unset | unset | No banner, no scripts. Site has no analytics. |

Consent cookie:
- Name: `analytics-consent`
- Values: `accepted` | `declined`
- Expiry: 365 days
- Path: `/`
- Set client-side via `document.cookie` — no Set-Cookie server hop needed.

## Architecture

### New dependency

`@next/third-parties` — Next.js's official integration for third-party scripts. Handles SPA pageview tracking on App Router navigations automatically; no manual `gtag('config', …, { page_path })` calls needed.

### New files

```
src/components/analytics/
├── Analytics.tsx              # async Server Component: reads cookies + env, decides what to render
└── ConsentBannerClient.tsx    # Client Component: banner UI + cookie writes
```

### `Analytics.tsx` (async Server Component)

Reads env vars, the `analytics-consent` cookie, and an optional `_cookie-preview` cookie (used only by the design-brief script). Returns SSR-correct output so the brief's `fetch()` captures the banner natively — no client-side URL-param check needed.

```tsx
import { cookies } from 'next/headers'
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { ConsentBannerClient } from './ConsentBannerClient'

export async function Analytics() {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID ?? ''
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? ''

  const cookieStore = await cookies()
  const consent = cookieStore.get('analytics-consent')?.value
  const preview = cookieStore.get('_cookie-preview')?.value === '1'

  if (consent === 'accepted') {
    if (gtmId) return <GoogleTagManager gtmId={gtmId} />
    if (ga4Id) return <GoogleAnalytics gaId={ga4Id} />
    return null
  }
  if (consent === 'declined') return null

  // Undecided — show banner if there's something to track OR we're in design-preview mode
  if (ga4Id || gtmId || preview) return <ConsentBannerClient />
  return null
}
```

After Accept/Decline, `ConsentBannerClient` writes the `analytics-consent` cookie and reloads the page. The reload triggers fresh SSR with the new cookie state, which then renders the `<GoogleAnalytics>` / `<GoogleTagManager>` script tag (accepted) or nothing (declined). One render path, no client-side mounting of script tags, no hydration mismatch.

`_cookie-preview=1` is the brief's escape hatch — set as a cookie on the chrome-capture fetch, it forces the banner to render even when no analytics ID is configured, so the design brief can capture its markup before a real GA/GTM ID exists.

### `ConsentBannerClient.tsx` (Client Component)

```tsx
'use client'

function setConsent(value: 'accepted' | 'declined') {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `analytics-consent=${value}; path=/; max-age=${oneYear}; samesite=lax`
  window.location.reload()
}

export function ConsentBannerClient() {
  return (
    <aside
      data-component="cookie-consent"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[calc(100%-2rem)] bg-background border border-border rounded-lg shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
    >
      <p data-slot="message" className="text-sm text-foreground">
        We use cookies to understand how visitors use our site.{' '}
        <a href="/privacy" className="underline">Learn more</a>.
      </p>
      <div className="flex gap-2 shrink-0">
        <Button data-slot="decline" variant="ghost" size="sm" onClick={() => setConsent('declined')}>
          Decline
        </Button>
        <Button data-slot="accept" size="sm" onClick={() => setConsent('accepted')}>
          Accept
        </Button>
      </div>
    </aside>
  )
}
```

Notes:
- Tag is `<aside>` so the existing `fetchRenderedMarkup` regex (which matches `header|footer|nav|aside`) captures it without needing changes.
- Slots are exposed via `data-slot="message|accept|decline"` so `design-overrides.css` can target precisely (`[data-component="cookie-consent"] [data-slot="accept"]`).
- Uses shadcn `Button` + theme tokens so default look respects the per-client palette.
- "Learn more" link points to `/privacy` (already a legal page in `siteConfig.legalLinks`).

### `src/app/layout.tsx` change

After `<Footer />`:

```tsx
<Analytics />
```

`Analytics` is an async Server Component that reads env + cookies internally, so no props are needed at the call site.

### Consent withdrawal — footer link

`src/components/footer/Footer.tsx` legal bar gains:

```tsx
<li>
  <button
    type="button"
    onClick={() => {
      document.cookie = 'analytics-consent=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.reload()
    }}
    className="hover:text-background"
  >
    Cookie preferences
  </button>
</li>
```

Since Footer is currently an async Server Component, this button needs extraction into a tiny client component (`FooterCookiePrefsLink.tsx`) imported into the Footer. The legal-bar `<ul>` already wraps `siteConfig.legalLinks` — we render the cookie-prefs link as a sibling `<li>`.

This satisfies the GDPR right-to-withdraw and means the banner reappears on next page load.

## Design handoff integration

### Brief script changes (`scripts/export-design-brief.ts`)

Three small additions:

1. **Force-render the banner** — when fetching the first page for chrome capture, send `Cookie: _cookie-preview=1` as a request header. The `Analytics` Server Component reads this via `cookies()` and renders the banner even without analytics IDs configured. Only this single brief-script fetch is affected.
2. **Capture `cookie-consent` in chrome map** — the existing `chromeRe = /<(header|footer|nav|aside)…data-component="([^"]+)"…/g` already matches `<aside>`, so no regex change is needed. The new id `cookie-consent` lands in `chromeMarkup` automatically.
3. **Emit a brief section** — extend the chrome-rendering block (currently `['navbar', 'footer']` ordered list) to `['navbar', 'footer', 'cookie-consent']`, and update the section heading from "Site chrome — NavBar & Footer" to "Site chrome — NavBar, Footer & Consent Banner". Add a paragraph above the rendered banner markup describing:
   - Selector: `[data-component="cookie-consent"]`
   - Slots: `[data-slot="message"]`, `[data-slot="accept"]`, `[data-slot="decline"]`
   - Token contract: respects `--color-background`, `--color-foreground`, `--color-border`, shadcn Button variants
   - What's expected to be styled: container surface, type weight, button treatment, optional brand accent

### What Claude.ai Design produces

`content/design-overrides.css` rules like:

```css
[data-component="cookie-consent"] {
  background: var(--color-primary);
  color: var(--color-near-white);
  border-radius: 0;
  /* full-bleed bottom bar variant */
  left: 0; right: 0; bottom: 0;
  transform: none; max-width: none; width: auto;
  border: none;
}
[data-component="cookie-consent"] [data-slot="accept"] {
  background: var(--color-action);
}
```

No code change needed to consume — `design-overrides.css` already loads after `theme.css` so its rules win.

## Files touched (summary)

**New:**
- `src/components/analytics/Analytics.tsx`
- `src/components/analytics/ConsentBannerClient.tsx`
- `src/components/footer/FooterCookiePrefsLink.tsx`

**Modified:**
- `src/app/layout.tsx` — render `<Analytics>` with env-derived IDs
- `src/components/footer/Footer.tsx` — insert cookie-prefs link in legal bar
- `scripts/export-design-brief.ts` — preview param on chrome fetch, banner in chrome list, banner doc paragraph
- `.env.example` — document `NEXT_PUBLIC_GA4_ID` and `NEXT_PUBLIC_GTM_ID`
- `README.md` — short "Analytics" subsection under existing "Form / email setup"
- `package.json` / `package-lock.json` — add `@next/third-parties`

## Verification

1. `npm install` succeeds, `@next/third-parties` resolves
2. `npx tsc --noEmit` clean
3. `npm run lint` clean (no new warnings)
4. `npm run build` clean
5. **No-IDs path:** unset both env vars, `npm run dev`, load `/` — no banner, no GA/GTM script in network tab, no cookie set
6. **GA4 path:** set `NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX`, restart dev, load `/` — banner appears, clicking Accept writes the `analytics-consent=accepted` cookie and loads `https://www.googletagmanager.com/gtag/js?id=G-…` in the Network tab
7. **GTM path:** set only `NEXT_PUBLIC_GTM_ID=GTM-XXXXXX`, same flow, loads `gtm.js?id=GTM-…`
8. **Both-set:** set both, confirm GTM loads and GA4 does NOT load separately
9. **Decline:** click Decline, confirm no script loads, cookie = `declined`, refresh — banner does not reappear
10. **Withdraw:** click "Cookie preferences" in footer, confirm cookie is cleared, banner reappears on reload
11. **Brief preview:** with no IDs set, `curl --cookie "_cookie-preview=1" http://localhost:3000/ | grep 'data-component="cookie-consent"'` — banner markup appears in the response (this is what the brief script relies on)
12. **Brief output:** `npm run export-brief` produces a `design-brief.md` that contains a "Cookie Consent Banner" section with verbatim rendered markup
13. **Design override sanity:** drop a CSS rule like `[data-component="cookie-consent"] { background: red; }` into `content/design-overrides.css` and confirm the banner picks it up

## Non-goals (YAGNI)

- Custom event helpers (e.g. `trackContactFormSubmit()`) — clients can wire these in GTM or as a follow-up.
- Granular consent categories (analytics vs ads vs functional) — single accept/decline.
- Custom CMP UI states (slide-in animation, multi-step modal, "more info" expander). Banner is a simple sticky card; design-overrides.css can restyle but not restructure.
- Paid CMP (Cookiebot, Iubenda, OneTrust).
- Geo-gating ("only show banner to EU visitors"). Simpler to always show; the cost is one extra click for US visitors.
- Auto-detect of Do Not Track / GPC signals. Could be added later; not in v1.
