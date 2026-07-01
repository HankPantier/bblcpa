#!/usr/bin/env tsx
/**
 * Export a design brief for Claude.ai Design.
 *
 * Usage:
 *   npm run export-brief                    # writes ./design-brief.md
 *   npm run export-brief -- --out brief.md  # custom output path
 *   npm run export-brief -- --stdout         # write to stdout
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Palette {
  primary: string
  secondary: string
  complementary: string
  action: string
  nearBlack: string
  nearWhite: string
}

interface BrandJson {
  firm: {
    name: string
    tagline?: string
    foundingYear?: string
  }
  contact?: {
    address?: {
      street?: string
      city?: string
      state?: string
      zip?: string
    }
    phone?: string
    email?: string
  }
  palette: Palette
}

interface DesignJson {
  typography: {
    headingFont: string
    bodyFont: string
    googleFontsUrl?: string
  }
  roundness?: string
  density?: string
  visualFeel?: string
  spacing?: Record<string, string>
  radius?: Record<string, string>
}

interface PageFile {
  filename: string
  raw: string
}

interface BlockSpec {
  id: string
  purpose: string
  variants: string[]
  tokens?: string
}

// ---------------------------------------------------------------------------
// Block catalog (21 blocks, sourced from component-library-spec.md)
// ---------------------------------------------------------------------------

const BLOCK_CATALOG: BlockSpec[] = [
  // Page-level
  {
    id: 'hero',
    purpose: 'Full-bleed, above-the-fold page opener.',
    variants: ['image', 'video', 'slider'],
    tokens: '--color-primary (overlay), --color-action (CTA), --font-heading',
  },
  {
    id: 'hero-split',
    purpose: 'Two-column page opener with text + image.',
    variants: ['image-right', 'image-left'],
  },
  {
    id: 'page-header',
    purpose: 'Slim inner-page title bar.',
    variants: [],
    tokens: '--color-primary (background), --color-near-white (text)',
  },
  // Inline
  {
    id: 'intro-text',
    purpose: 'Short headline + paragraph transition between sections.',
    variants: ['centered', 'left-aligned'],
  },
  {
    id: 'content-split',
    purpose: 'Narrative paragraph with a supporting image.',
    variants: ['image-right', 'image-left'],
  },
  {
    id: 'content-prose',
    purpose: 'Long-form copy with no supporting image.',
    variants: [],
  },
  {
    id: 'checklist-section',
    purpose: 'List of benefits, inclusions, or qualifying criteria.',
    variants: ['with-image', 'standalone'],
    tokens: '--color-action (checkmark icon)',
  },
  {
    id: 'process-steps',
    purpose: 'Numbered or sequential how-it-works explanation.',
    variants: ['horizontal', 'vertical'],
  },
  {
    id: 'feature-grid',
    purpose: '3–8 equal-weight features with icon + short description.',
    variants: ['3-col', '4-col'],
  },
  {
    id: 'service-cards',
    purpose: '2–9 named services with descriptions and links.',
    variants: ['2-col', '3-col'],
  },
  {
    id: 'content-cards',
    purpose: 'Blog posts, articles, or resources with images.',
    variants: ['3-col', '2-col'],
  },
  {
    id: 'team-grid',
    purpose: 'Staff or partner profiles with photos.',
    variants: ['2-col', '3-col', '4-col'],
  },
  {
    id: 'industry-cards',
    purpose: 'Industry or niche verticals with icons.',
    variants: ['3-col', '4-col'],
  },
  {
    id: 'testimonials',
    purpose: 'Client quotes or reviews.',
    variants: ['carousel', 'grid'],
  },
  {
    id: 'stats-bar',
    purpose: '3–4 numeric proof points (years, clients, staff).',
    variants: ['3-up', '4-up'],
    tokens: '--color-primary (bg), --color-near-white (text)',
  },
  {
    id: 'logo-bar',
    purpose: 'Certification badges or association logos.',
    variants: [],
  },
  {
    id: 'cta-banner',
    purpose: 'A direct call to action with a single button.',
    variants: ['color-bg', 'image-bg'],
    tokens: '--color-action, --color-primary, --color-near-white',
  },
  {
    id: 'pricing',
    purpose: 'Tiered service packages with feature lists and prices.',
    variants: ['2-tier', '3-tier', '4-tier'],
  },
  {
    id: 'faq-accordion',
    purpose: 'Expandable question-and-answer pairs.',
    variants: [],
  },
  {
    id: 'form',
    purpose: 'A lead-capture, contact, or newsletter signup form. The custom variant renders field definitions declared in markdown.',
    variants: ['contact', 'quote', 'newsletter', 'custom'],
  },
  {
    id: 'content-table',
    purpose: 'Comparison data, calendars, or structured reference info.',
    variants: [],
  },
  {
    id: 'contact-info',
    purpose: 'Auto-filled contact info card. Reads phone, email, fax, address, and hours from brand.json — no markdown body needed. Two-column layout (Reach out | Visit) with lucide icons (Phone, Mail, Printer, MapPin, Clock).',
    variants: [],
    tokens: '--color-primary (icons), --color-foreground (values), --color-border',
  },
  {
    id: 'map',
    purpose: 'Embedded Google Map for the firm address from brand.json. Single iframe in a 16:9 rounded frame.',
    variants: [],
    tokens: '--color-border (frame), --radius-lg (corner)',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YAML frontmatter + body from a markdown file. Very light parser. */
function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, body: raw }
  }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) {
    return { frontmatter: {}, body: raw }
  }
  const yamlBlock = raw.slice(4, end)
  const body = raw.slice(end + 4).replace(/^\n/, '')
  const frontmatter: Record<string, string> = {}
  for (const line of yamlBlock.split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) frontmatter[key] = value
  }
  return { frontmatter, body }
}

/** Extract block annotation IDs from page body in order. */
function extractBlockIds(body: string): string[] {
  const ids: string[] = []
  const re = /<!--\s*block:\s*([a-z-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    ids.push(m[1])
  }
  return ids
}

/** Derive URL from filename: home.md → /, about.md → /about */
function urlFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/, '')
  if (base === 'home') return '/'
  // Files use "--" to encode "/" since "/" isn't filename-safe
  return '/' + base.replace(/--/g, '/')
}

/**
 * Fetch real rendered HTML for each block + chrome component from a running
 * dev server. Walks every page, extracts the outer element matching either
 * data-block="..." (the 23 content blocks) or data-component="..." (NavBar /
 * Footer), and keeps the first sample encountered per id.
 *
 * The regex matches a block's outer tag (<section>, <header>, <aside>, or
 * <footer>) and balances opening/closing by tag name — works because no
 * block contains a nested same-tag element with a sibling data-block (the
 * render tree puts blocks as siblings, not nested).
 *
 * Returns an empty map if the server isn't reachable. The caller falls
 * back to "no sample available" with a note in the brief output.
 */
async function fetchRenderedMarkup(
  serverUrl: string,
  pageUrls: string[]
): Promise<{ blocks: Map<string, string>; components: Map<string, string> }> {
  const blocks = new Map<string, string>()
  const components = new Map<string, string>()
  const blockRe = /<(section|header|aside|footer)([^>]*\sdata-block="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g
  const chromeRe = /<(header|footer|nav|aside)([^>]*\sdata-component="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g

  for (const url of pageUrls) {
    let html: string
    try {
      const res = await fetch(`${serverUrl}${url}`, {
        // _cookie-preview=1 forces <Analytics> to render the consent banner
        // even when no NEXT_PUBLIC_GA4_ID / NEXT_PUBLIC_GTM_ID is set, so
        // the brief can capture banner markup before a real analytics ID
        // is wired up per-client.
        headers: { cookie: '_cookie-preview=1' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) continue
      html = await res.text()
    } catch {
      continue  // Server unreachable or page errored — skip
    }

    // Walk block matches. The regex finds the first inner match-pair only;
    // for nested same-tag (e.g. a <section> inside a <section>) we'd need a
    // real parser, but rendered blocks are siblings so this is safe.
    let m: RegExpExecArray | null
    blockRe.lastIndex = 0
    while ((m = blockRe.exec(html)) !== null) {
      const blockId = m[3]
      if (!blocks.has(blockId)) {
        blocks.set(blockId, m[0])
      }
    }
    chromeRe.lastIndex = 0
    while ((m = chromeRe.exec(html)) !== null) {
      const componentId = m[3]
      if (!components.has(componentId)) {
        components.set(componentId, m[0])
      }
    }
  }

  return { blocks, components }
}

// ---------------------------------------------------------------------------
// Brief builder
// ---------------------------------------------------------------------------

interface BriefInput {
  brand: BrandJson
  design: DesignJson
  brandMd: string
  pages: PageFile[]
  /**
   * Rendered HTML samples keyed by data-block / data-component id. Populated
   * by fetchRenderedMarkup when --server is reachable; empty Map otherwise
   * (the brief degrades gracefully with a note instead of HTML).
   */
  blockMarkup?: Map<string, string>
  chromeMarkup?: Map<string, string>
}

function buildBrief({ brand, design, brandMd, pages, blockMarkup, chromeMarkup }: BriefInput): string {
  const { firm, contact, palette } = brand
  const { typography, roundness, density, visualFeel, spacing, radius } = design

  const city = contact?.address?.city ?? ''
  const state = contact?.address?.state ?? ''
  const location = city && state ? `${city}, ${state}` : city || state || ''

  const sections: string[] = []

  // ------------------------------------------------------------------
  // Title + intro
  // ------------------------------------------------------------------
  sections.push(`# Design Brief — ${firm.name}

This brief is a structured prompt for **Claude.ai Design** to produce visual styling for ${firm.name}'s website. The brief contains the client's brand identity, the component vocabulary used to build the site, sample content, and a contract for how to format your output.

## What we're asking you to do

Produce two outputs:

1. **\`design-overrides.css\`** — a CSS file that augments the default theme. Target blocks via the \`data-block\` attribute selectors listed below. Focus on the blocks that most define this site's identity (hero, content-split, feature-grid, cta-banner, faq-accordion). Aim for 50–200 lines.

2. **A refined \`design.json\`** (optional) — if you'd recommend changes to the palette, typography, or token scale, output an updated \`design.json\` reflecting your refinements. Otherwise just say "no token changes needed."

Don't propose changes to the React component tree or block markup — those are fixed. Style only.`)

  // ------------------------------------------------------------------
  // Firm context
  // ------------------------------------------------------------------
  const firmLines: string[] = [
    `**Name:** ${firm.name}`,
    firm.tagline ? `**Tagline:** ${firm.tagline}` : '',
    firm.foundingYear ? `**Founded:** ${firm.foundingYear}` : '',
    location ? `**Location:** ${location}` : '',
  ].filter(Boolean)

  sections.push(`---

## Firm context

${firmLines.join('\n')}${brandMd ? `\n\n${brandMd.trim()}` : ''}`)

  // ------------------------------------------------------------------
  // Current tokens
  // ------------------------------------------------------------------

  // Palette table
  const paletteRows = [
    ['primary', palette.primary],
    ['secondary', palette.secondary],
    ['complementary', palette.complementary],
    ['action', palette.action],
    ['near-black', palette.nearBlack],
    ['near-white', palette.nearWhite],
  ]
    .map(([role, hex]) => `| ${role} | ${hex} |`)
    .join('\n')

  // Typography
  const typoLines = [
    `- Heading font: **${typography.headingFont}**`,
    `- Body font: **${typography.bodyFont}**`,
    typography.googleFontsUrl ? `- Google Fonts URL: ${typography.googleFontsUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Shape system
  const shapeLines = [
    roundness ? `- Roundness: **${roundness}** (pill value: ${radius?.pill ?? 'n/a'})` : '',
    density ? `- Density: **${density}**` : '',
    visualFeel ? `- Visual feel: **${visualFeel}**` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Spacing scale
  const spacingList = spacing
    ? Object.entries(spacing)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : '(not defined)'

  // Radius scale
  const radiusList = radius
    ? Object.entries(radius)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : '(not defined)'

  sections.push(`---

## Current tokens

### Palette

| Role | Hex |
|---|---|
${paletteRows}

### Typography

${typoLines}

### Shape system

${shapeLines}

### Spacing scale

${spacingList}

### Radius scale

${radiusList}`)

  // ------------------------------------------------------------------
  // CSS variable contract
  // ------------------------------------------------------------------
  sections.push(`---

## CSS variable contract

These are the CSS variables the template defines. You can refine them via \`design.json\` (which feeds \`theme.css\` via the theme generator). Anything beyond these — block-specific tints, shadows, gradients — goes in \`design-overrides.css\`.

### Color variables (from palette → HSL)

- \`--color-primary\`, \`--color-primary-foreground\`
- \`--color-secondary\`, \`--color-secondary-foreground\`
- \`--color-accent\`, \`--color-accent-foreground\` (derived from complementary)
- \`--color-background\`, \`--color-foreground\`
- \`--color-muted\`, \`--color-muted-foreground\`
- \`--color-card\`, \`--color-card-foreground\`
- \`--color-popover\`, \`--color-popover-foreground\`
- \`--color-border\`, \`--color-input\`
- \`--color-ring\` (derived from action)
- \`--color-destructive\`, \`--color-destructive-foreground\`

### Direct hex tokens (for direct CSS usage)

- \`--color-action\` (the brand cyan or equivalent — used for CTAs)
- \`--color-action-foreground\`
- \`--color-primary-hex\`, \`--color-near-black\`, \`--color-near-white\`, \`--color-complementary\`

### Spacing / radius / font

- \`--c5-space-xs\` through \`--c5-space-2xl\` (brand spacing scale; intentionally namespaced to avoid Tailwind v4's \`--spacing-*\` namespace, which feeds max-w/w/h/p/m/gap utilities. If you want a Tailwind utility value, use the native scale: p-1=4px, p-2=8px, p-4=16px, p-6=24px, p-12=48px, p-24=96px)
- \`--radius-sm\`, \`--radius-md\`, \`--radius-lg\`, \`--radius-pill\`, \`--radius\` (default)
- \`--font-heading\`, \`--font-body\`

### Prose baseline in globals.css

The template's \`src/app/globals.css\` ships baseline \`.prose\` rules (outside @layer base since Tailwind v4 tree-shakes custom selectors from base):
- \`.prose p\`, \`.prose ul\`, \`.prose ol\`, \`.prose blockquote\` get \`margin-bottom: 1em\` (last-child zeroed)
- \`.prose ul\` / \`.prose ol\` get list-style + \`padding-left: 1.5em\`
- \`.prose h2/h3/h4\` get \`font-weight: 600\` + top/bottom margins
- \`.prose a\` gets \`text-decoration: underline\`
- \`.prose strong\` gets \`font-weight: 600\`

If you want to override prose for a specific block, scope to that block: \`[data-block="cta-banner"] .prose p { margin-bottom: 0.5em }\` rather than redefining the global rules.`)

  // ------------------------------------------------------------------
  // Block vocabulary
  // ------------------------------------------------------------------

  // Page-level blocks
  const pageLevelBlocks = BLOCK_CATALOG.slice(0, 3)
  const inlineBlocks = BLOCK_CATALOG.slice(3)

  /** Render the "Sample rendered HTML" code-fence for a block if we have one. */
  const renderSample = (blockId: string): string => {
    const html = blockMarkup?.get(blockId)
    if (!html) return ''
    return `\n\n**Sample rendered HTML** (verbatim from the dev server — target child selectors precisely):\n\n\`\`\`html\n${html}\n\`\`\``
  }

  const pageLevelMd = pageLevelBlocks
    .map(b => {
      const variantsStr = b.variants.length ? b.variants.join(', ') : '(none)'
      const tokensLine = b.tokens ? `\n**Currently uses:** ${b.tokens}` : ''
      return `#### \`[data-block="${b.id}"]\`\n**Purpose:** ${b.purpose}\n**Variants:** ${variantsStr}${tokensLine}${renderSample(b.id)}`
    })
    .join('\n\n')

  const inlineMd = inlineBlocks
    .map(b => {
      const variantsStr = b.variants.length ? b.variants.join(', ') : '(none)'
      const tokensLine = b.tokens
        ? `**Currently uses:** ${b.tokens}`
        : '**Currently uses:** shadcn semantic colors (card, foreground, muted)'
      return `#### \`[data-block="${b.id}"]\`\n**Purpose:** ${b.purpose}\n**Variants:** ${variantsStr}\n${tokensLine}${renderSample(b.id)}`
    })
    .join('\n\n')

  sections.push(`---

## Block vocabulary

The site is composed from ${BLOCK_CATALOG.length} reusable blocks. Each block has a \`data-block\` attribute on its outer element — use that as your primary selector in \`design-overrides.css\`.

For each block, the catalog below lists its purpose, variants, and which CSS tokens it currently consumes.

### Page-level blocks (one per page, from frontmatter \`hero:\` field)

${pageLevelMd}

### Inline blocks (selected during content generation, annotated \`<!-- block: ... -->\`)

${inlineMd}`)

  // ------------------------------------------------------------------
  // Site chrome (NavBar + Footer)
  // ------------------------------------------------------------------
  sections.push(`---

## Site chrome — NavBar, Footer & Consent Banner

Outside the 23 page blocks, the site has three persistent components rendered by \`src/app/layout.tsx\`: the **NavBar** (top, sticky), the **Footer** (bottom), and the **Cookie Consent Banner** (sticky bottom card, shown until the visitor accepts or declines). They each carry a stable \`data-component\` attribute on their outer element for design-override targeting.

### NavBar — \`[data-component="navbar"]\`

A sticky \`<header>\` at the top of every page. Layout left→right: firm logo (or wordmark fallback) → desktop NavigationMenu (hidden below md) → optional CTA button (\`nav.cta\` from \`nav.json\`) → mobile hamburger menu (visible below md).

**Key sub-elements to know about:**
- The header background toggles on scroll: \`bg-background\` at top, \`bg-background/95 backdrop-blur border-b border-border\` after 12px scroll. To restyle this transition, target \`[data-component="navbar"]\` and override.
- Top-level nav links: \`[data-component="navbar"] a[role="menuitem"]\` (shadcn NavigationMenuLink) or just \`[data-component="navbar"] nav a\`.
- Active nav state: links + triggers get \`aria-current="page"\` (for current page) and the trigger gets \`data-active\` (for trigger whose subtree contains the current page). Currently styled as \`text-primary underline underline-offset-8\`. Override via \`[data-component="navbar"] a[aria-current="page"] { ... }\`.
- Dropdown sub-menu panel: \`[data-component="navbar"] [data-radix-popper-content-wrapper] ul\` (Radix-rendered) or just \`[data-component="navbar"] li[role="menuitem"]\` for individual sub-links.
- Mobile menu: built on shadcn Sheet (\`<aside>\` slide-out) + Accordion. Selector: \`[role="dialog"]\` (Sheet).

### Footer — \`[data-component="footer"]\`

The Footer is a server component. Default styling: \`bg-foreground text-background\` (inverted color — dark background, light text). Three vertical zones:

1. **Main grid** (\`md:grid-cols-4\`): firm logo + tagline, then 3 columns of nav links sourced from \`nav.json\`.
2. **Certifications bar**: row of \`brand.certifications[]\` logos with a top separator.
3. **Legal bar**: copyright + \`siteConfig.legalLinks\` + social icons row.

**Key sub-elements:**
- Top-level footer: \`[data-component="footer"]\`
- Each zone is separated by shadcn \`<Separator />\` (rendered as \`hr\`).
- Logo: \`[data-component="footer"] img\` (rendered with \`invert opacity-90\` so a dark logo reads on a dark background; for clients with already-light logos you may want to override this).
- Social icons: lucide \`<Mail/>\`, plus an inline-SVG \`SocialIcon\` component for branded platforms (Facebook, LinkedIn, Twitter, etc.). Target via \`[data-component="footer"] [aria-label*="Visit"]\` or by SVG class.
- Bottom legal text: \`[data-component="footer"] p.text-background\\/50\` (faded body color).

### Cookie Consent Banner — \`[data-component="cookie-consent"]\`

A small sticky \`<aside>\` pinned to the bottom of the viewport. Renders only when (a) at least one analytics ID is configured (\`NEXT_PUBLIC_GA4_ID\` or \`NEXT_PUBLIC_GTM_ID\`) and (b) the visitor hasn't yet accepted or declined. Accepting writes the \`analytics-consent=accepted\` cookie and reloads the page; the page then SSRs with the GA/GTM \`<script>\` injected.

**Key sub-elements:**
- Container: \`[data-component="cookie-consent"]\` — the outer \`<aside>\`. Default surface is \`bg-background border border-border\`, but the brand may want a full-bleed primary-color bar, a pill-shaped card, etc.
- Message text: \`[data-component="cookie-consent"] [data-slot="message"]\` (paragraph; includes a "Learn more" link to \`/privacy\`).
- Accept button: \`[data-component="cookie-consent"] [data-slot="accept"]\` (shadcn Button default variant).
- Decline button: \`[data-component="cookie-consent"] [data-slot="decline"]\` (shadcn Button ghost variant).

**Token contract:** respects \`--color-background\`, \`--color-foreground\`, \`--color-border\`, \`--color-primary\`, \`--color-action\`. Override the container surface, type weight/size, and button treatments freely. Keep the buttons visually distinguishable (Accept = primary action, Decline = secondary).

### When to use \`[data-component="..."]\` vs \`[data-block="..."]\`

- \`data-component\` is for persistent site chrome (NavBar, Footer, Cookie Consent Banner) that appears on every page.
- \`data-block\` is for content blocks that appear inline based on the page's markdown. Don't mix the two namespaces in one selector.${
  chromeMarkup && chromeMarkup.size > 0
    ? `\n\n### Rendered chrome markup (verbatim)\n\n${['navbar', 'footer', 'cookie-consent']
        .map(id => {
          const html = chromeMarkup.get(id)
          if (!html) return ''
          return `#### \`[data-component="${id}"]\`\n\n\`\`\`html\n${html}\n\`\`\``
        })
        .filter(Boolean)
        .join('\n\n')}`
    : ''
}`)

  // ------------------------------------------------------------------
  // Sample content
  // ------------------------------------------------------------------

  const pageSections = pages.map(({ filename, raw }) => {
    const { frontmatter, body } = parseFrontmatter(raw)
    const url = frontmatter['url'] ?? urlFromFilename(filename)
    const pageTitle = frontmatter['title'] ?? filename
    const heroBlock = frontmatter['hero'] ?? 'unknown'
    const heroVariant = frontmatter['hero_variant'] ?? 'unknown'
    const blockIds = extractBlockIds(body)
    const sectionsStr = blockIds.length ? blockIds.join(', ') : '(none)'

    return `### ${url} (${pageTitle})

**Hero:** ${heroBlock} (${heroVariant})
**Sections:** ${sectionsStr}

${body.trim()}`
  })

  sections.push(`---

## Sample content

The actual pages this template renders. Use these to inform your styling — what does a "real" feature-grid look like? What's the longest content-prose section?

${pageSections.join('\n\n---\n\n')}`)

  // ------------------------------------------------------------------
  // Output format instructions
  // ------------------------------------------------------------------
  sections.push(`---

## Output format

When you produce \`design-overrides.css\`, prefix it with this comment header:

\`\`\`css
/* design-overrides.css for ${firm.name}
 * Generated by Claude.ai Design — YYYY-MM-DD
 * Save this file to: content/design-overrides.css
 * Loaded by src/app/globals.css after theme.css.
 */
\`\`\`

Use \`data-block\` attribute selectors for block-specific overrides. Use \`:root\` overrides for global token tweaks. Don't use \`!important\` unless absolutely necessary.

If you propose changes to \`design.json\`, output it as a fenced \`\`\`json block with the full file content (not just a diff).`)

  return sections.join('\n\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const stdoutOnly = args.includes('--stdout')
  const outIdx = args.indexOf('--out')
  const outPath = outIdx >= 0 ? args[outIdx + 1] : 'design-brief.md'

  // --server <url> opts into fetching real rendered HTML samples from a
  // running dev/build server. Default behavior: try localhost:3001 (the
  // template's default port), silently fall back to no-samples if the
  // server isn't responding.
  const serverIdx = args.indexOf('--server')
  const noMarkupFlag = args.includes('--no-markup')
  const serverUrl = serverIdx >= 0 ? args[serverIdx + 1] : 'http://localhost:3001'

  if (outIdx >= 0 && !outPath) {
    console.error('Error: --out requires a path argument')
    process.exit(1)
  }

  const repoRoot = process.cwd()
  const contentDir = path.join(repoRoot, 'content')

  // Load required files
  let brand: BrandJson
  let design: DesignJson
  try {
    brand = JSON.parse(await fs.readFile(path.join(contentDir, 'brand.json'), 'utf-8')) as BrandJson
  } catch (err) {
    console.error('Error: could not read content/brand.json —', (err as Error).message)
    process.exit(1)
  }

  try {
    design = JSON.parse(
      await fs.readFile(path.join(contentDir, 'design.json'), 'utf-8')
    ) as DesignJson
  } catch (err) {
    console.error('Error: could not read content/design.json —', (err as Error).message)
    process.exit(1)
  }

  // Load optional brand.md
  let brandMd = ''
  try {
    const raw = await fs.readFile(path.join(contentDir, 'brand.md'), 'utf-8')
    // Strip leading "# About …" heading to avoid duplication
    brandMd = raw.replace(/^# About [^\n]+\n+/, '')
  } catch {
    // optional — fine if missing
  }

  // Load pages
  const pagesDir = path.join(contentDir, 'pages')
  const pageFiles = await fs.readdir(pagesDir).catch(() => [] as string[])
  const pages = await Promise.all(
    pageFiles
      .filter(f => f.endsWith('.md'))
      .sort()
      .map(async f => {
        const raw = await fs.readFile(path.join(pagesDir, f), 'utf-8')
        return { filename: f, raw }
      })
  )

  // Optionally fetch real rendered HTML samples from a running dev server.
  // Skipped silently if --no-markup is set or the server isn't reachable.
  let blockMarkup: Map<string, string> | undefined
  let chromeMarkup: Map<string, string> | undefined
  if (!noMarkupFlag) {
    const pageUrls = pages.map(p => urlFromFilename(p.filename))
    const samples = await fetchRenderedMarkup(serverUrl, pageUrls)
    if (samples.blocks.size > 0 || samples.components.size > 0) {
      blockMarkup = samples.blocks
      chromeMarkup = samples.components
      console.log(
        `Rendered markup fetched from ${serverUrl}: ${samples.blocks.size} blocks, ${samples.components.size} chrome components`
      )
    } else {
      console.log(
        `Note: no rendered markup samples fetched (server ${serverUrl} unreachable or returned no blocks). Brief will use text descriptions only.`
      )
    }
  }

  const md = buildBrief({ brand, design, brandMd, pages, blockMarkup, chromeMarkup })

  if (stdoutOnly) {
    process.stdout.write(md)
  } else {
    await fs.writeFile(path.join(repoRoot, outPath), md, 'utf-8')
    const lines = md.split('\n').length
    console.log(`Written ${outPath} (${md.length.toLocaleString()} chars, ${lines.toLocaleString()} lines)`)
    console.log('')
    console.log('Next steps:')
    console.log('  1. Open Claude.ai → start a new chat')
    console.log(`  2. Attach ${outPath} (or paste its contents)`)
    console.log('  3. Ask: "Produce design-overrides.css per the brief"')
    console.log('  4. Save the returned CSS to content/design-overrides.css')
    console.log('  5. Run `npm run dev` to see the styling applied')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
