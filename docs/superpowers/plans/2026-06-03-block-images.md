# Block Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make images work end-to-end across every block — a clean `![alt](src)` authoring syntax, local-or-URL resolution, explicit alt text, and committed placeholders so the template renders clean.

**Architecture:** A single pure helper `resolveImageSrc()` owns local-filename-vs-URL resolution; every component calls it instead of hardcoding `/content-assets/${x}`. A new `extractLeadingImage()` pulls the first Markdown image out of a block body (and strips it from the prose) for single-image blocks; per-item parsers already capture refs, so their components just need the resolver. Remote `next/image` is enabled via `images.remotePatterns`; CSP `img-src` already allows `https:`.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript, Zod 4, Vitest 4, Node `zlib` (placeholder PNG generation).

---

## File structure

**Create:**
- `src/lib/assembly/resolve-image.ts` — `resolveImageSrc()` helper
- `src/lib/assembly/resolve-image.test.ts` — its tests
- `src/lib/assembly/extract-block-props.test.ts` — extractor tests (none exist today)
- `scripts/generate-placeholder.ts` — pure-Node solid-color PNG generator
- `public/content-assets/.gitkeep` — ensures the asset dir is committed
- `public/content-assets/hero-office.png`, `public/content-assets/team-photo.png` — generated placeholders

**Modify:**
- `src/lib/assembly/md-utils.ts` — add `extractLeadingImage()`; extend `parseH3CardList()` with image capture
- `src/lib/assembly/md-utils.test.ts` — tests for the two above
- `src/lib/assembly/page-frontmatter-schema.ts` — add `hero_image_alt`
- `src/lib/assembly/parse-page-md.ts` — thread `hero_image_alt` into the manifest
- `src/lib/assembly/extract-block-props.ts` — wire body images into ContentSplit/ChecklistSection/CtaBanner; HeroSplit alt
- `src/components/blocks/{Hero,HeroSplit,ContentSplit,ChecklistSection,CtaBanner,ServiceCards,TeamGrid,ContentCards,LogoBar}.tsx` — use `resolveImageSrc()`
- `src/app/insights/page.tsx`, `src/app/insights/[slug]/page.tsx` — use `resolveImageSrc()`
- `src/components/footer/Footer.tsx`, `src/components/nav/NavBar.tsx` — use `resolveImageSrc()`
- `next.config.ts` — add `images.remotePatterns`
- `scripts/validate-deliverable.ts` — skip `http(s)` URLs for `hero_image`
- `content/pages/home.md` — demonstrate `![alt](src)`; point refs at `.png`
- `docs/blocks.md`, `docs/authoring-content.md`, `docs/architecture.md` — document the new method

---

## Task 1: `resolveImageSrc()` helper

**Files:**
- Create: `src/lib/assembly/resolve-image.ts`
- Test: `src/lib/assembly/resolve-image.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/assembly/resolve-image.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveImageSrc } from './resolve-image'

describe('resolveImageSrc', () => {
  it('returns undefined for empty/undefined', () => {
    expect(resolveImageSrc(undefined)).toBeUndefined()
    expect(resolveImageSrc('')).toBeUndefined()
    expect(resolveImageSrc('   ')).toBeUndefined()
  })

  it('prefixes a bare filename with /content-assets/', () => {
    expect(resolveImageSrc('team-photo.jpg')).toBe('/content-assets/team-photo.jpg')
    expect(resolveImageSrc('  hero.png  ')).toBe('/content-assets/hero.png')
  })

  it('passes http(s) URLs through unchanged', () => {
    expect(resolveImageSrc('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
    expect(resolveImageSrc('http://example.com/b.png')).toBe('http://example.com/b.png')
  })

  it('passes absolute paths through unchanged', () => {
    expect(resolveImageSrc('/content-assets/x.png')).toBe('/content-assets/x.png')
    expect(resolveImageSrc('/local.svg')).toBe('/local.svg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assembly/resolve-image.test.ts`
Expected: FAIL — cannot find module `./resolve-image`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/assembly/resolve-image.ts`:

```ts
/**
 * resolve-image.ts
 * Single source of truth for turning an authored image reference into an
 * <Image src>. Pure and dependency-free so it works in both server and client
 * components.
 *
 *   undefined / empty   → undefined (callers render their graceful placeholder)
 *   "https://…"         → returned as-is (remote; needs next.config remotePatterns)
 *   "/already/a/path"   → returned as-is
 *   "team-photo.jpg"    → "/content-assets/team-photo.jpg"
 */
export function resolveImageSrc(ref?: string): string | undefined {
  if (!ref) return undefined
  const trimmed = ref.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  return `/content-assets/${trimmed}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assembly/resolve-image.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assembly/resolve-image.ts src/lib/assembly/resolve-image.test.ts
git commit -m "feat(images): add resolveImageSrc local/URL resolver"
```

---

## Task 2: `extractLeadingImage()` in md-utils

**Files:**
- Modify: `src/lib/assembly/md-utils.ts`
- Test: `src/lib/assembly/md-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/assembly/md-utils.test.ts` (add `extractLeadingImage` to the existing `import { ... } from './md-utils'` line):

```ts
describe('extractLeadingImage', () => {
  it('returns body unchanged when there is no image', () => {
    const r = extractLeadingImage('Just some prose.\n\nMore prose.')
    expect(r.src).toBeUndefined()
    expect(r.alt).toBeUndefined()
    expect(r.body).toBe('Just some prose.\n\nMore prose.')
  })

  it('pulls a leading image and strips it from the body', () => {
    const r = extractLeadingImage('![Our team](team-photo.jpg)\n\nWhen you call us…')
    expect(r.src).toBe('team-photo.jpg')
    expect(r.alt).toBe('Our team')
    expect(r.body).toBe('When you call us…')
  })

  it('captures a URL src and empty alt', () => {
    const r = extractLeadingImage('![](https://cdn.example.com/x.png)\n\nBody')
    expect(r.src).toBe('https://cdn.example.com/x.png')
    expect(r.alt).toBeUndefined()
    expect(r.body).toBe('Body')
  })

  it('extracts an image that is not on the first line and collapses the gap', () => {
    const r = extractLeadingImage('Intro line.\n\n![alt](pic.png)\n\nTail.')
    expect(r.src).toBe('pic.png')
    expect(r.body).toBe('Intro line.\n\nTail.')
  })

  it('ignores a plain link (not an image)', () => {
    const r = extractLeadingImage('[Label](/url)\n\nBody')
    expect(r.src).toBeUndefined()
    expect(r.body).toBe('[Label](/url)\n\nBody')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assembly/md-utils.test.ts -t extractLeadingImage`
Expected: FAIL — `extractLeadingImage is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/assembly/md-utils.ts`, add this function immediately after `extractTrailingCta` (after its closing `}` near line 82):

```ts
/**
 * Pull the first standalone Markdown image (`![alt](src)`) out of a body and
 * return it alongside the body with that image removed (so it doesn't also
 * render inside the prose). `src` may be a local filename or a full URL —
 * resolution is the caller's job via resolveImageSrc(). Never throws.
 */
export function extractLeadingImage(body: string): {
  src?: string
  alt?: string
  body: string
} {
  // ![alt](src) — src stops at whitespace or ')'; an optional "title" is ignored.
  const re = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/
  const m = body.match(re)
  if (!m || m.index === undefined) return { body }
  const alt = m[1].trim() || undefined
  const src = m[2].trim()
  const cleaned = (body.slice(0, m.index) + body.slice(m.index + m[0].length))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { src, alt, body: cleaned }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assembly/md-utils.test.ts -t extractLeadingImage`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assembly/md-utils.ts src/lib/assembly/md-utils.test.ts
git commit -m "feat(images): add extractLeadingImage markdown-image helper"
```

---

## Task 3: `hero_image_alt` frontmatter through to the manifest

**Files:**
- Modify: `src/lib/assembly/page-frontmatter-schema.ts:44`
- Modify: `src/lib/assembly/parse-page-md.ts` (type + return)
- Test: `src/lib/assembly/page-frontmatter-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/assembly/page-frontmatter-schema.test.ts` (inside the existing top-level `describe`, matching its style):

```ts
it('accepts an optional hero_image_alt string', () => {
  const fm = PageFrontmatterSchema.parse({ hero_image_alt: 'Team in the office' })
  expect(fm.hero_image_alt).toBe('Team in the office')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assembly/page-frontmatter-schema.test.ts -t hero_image_alt`
Expected: FAIL — `fm.hero_image_alt` is `undefined` (passthrough keeps the key but the typed field doesn't exist, so the typed access compiles only after the schema field is added; the assertion fails until then).

- [ ] **Step 3: Add the schema field**

In `src/lib/assembly/page-frontmatter-schema.ts`, add the line after `hero_image: z.string().optional(),` (line 44):

```ts
    hero_image: z.string().optional(),
    hero_image_alt: z.string().optional(),
```

- [ ] **Step 4: Thread it through the manifest**

In `src/lib/assembly/parse-page-md.ts`, add to the `PageManifest` type after `hero_image?: string` (line 40):

```ts
  hero_image?: string
  hero_image_alt?: string
```

And in the returned object in `parsePageMd`, add after `hero_image: fm.hero_image,` (line 144):

```ts
    hero_image: fm.hero_image,
    hero_image_alt: fm.hero_image_alt,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/assembly/page-frontmatter-schema.test.ts -t hero_image_alt`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/assembly/page-frontmatter-schema.ts src/lib/assembly/parse-page-md.ts src/lib/assembly/page-frontmatter-schema.test.ts
git commit -m "feat(images): add hero_image_alt frontmatter field"
```

---

## Task 4: Wire body images into single-image extractors + HeroSplit alt

**Files:**
- Modify: `src/lib/assembly/extract-block-props.ts`
- Test: `src/lib/assembly/extract-block-props.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/assembly/extract-block-props.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  extractContentSplitProps,
  extractChecklistSectionProps,
  extractCtaBannerProps,
  extractHeroSplitProps,
} from './extract-block-props'
import type { PageSection, PageManifest } from './parse-page-md'

function section(partial: Partial<PageSection>): PageSection {
  return {
    blockId: 'content-split',
    heading: 'Heading',
    content: '',
    position: 0,
    ...partial,
  }
}

describe('extractContentSplitProps', () => {
  it('takes the body image and strips it from the prose', () => {
    const s = section({
      variant: 'image-right',
      content: '![Our team](team.jpg)\n\nProse body here.',
    })
    const props = extractContentSplitProps(s)
    expect(props.image).toBe('team.jpg')
    expect(props.image_alt).toBe('Our team')
    expect(props.body).toBe('Prose body here.')
  })

  it('falls back to the | image: attribute and the heading for alt', () => {
    const s = section({ heading: 'Built on Trust', image: 'attr.jpg', content: 'Body.' })
    const props = extractContentSplitProps(s)
    expect(props.image).toBe('attr.jpg')
    expect(props.image_alt).toBe('Built on Trust')
  })

  it('accepts a URL as the body image', () => {
    const s = section({ content: '![alt](https://cdn.x/p.png)\n\nBody.' })
    const props = extractContentSplitProps(s)
    expect(props.image).toBe('https://cdn.x/p.png')
  })
})

describe('extractChecklistSectionProps', () => {
  it('pulls the body image, leaving bullets intact', () => {
    const s = section({
      blockId: 'checklist-section',
      variant: 'with-image',
      heading: 'Why us',
      content: '![Office](office.jpg)\n\n- Fast\n- Friendly',
    })
    const props = extractChecklistSectionProps(s)
    expect(props.image).toBe('office.jpg')
    expect(props.image_alt).toBe('Office')
    expect(props.items).toEqual(['Fast', 'Friendly'])
  })
})

describe('extractCtaBannerProps', () => {
  it('uses the body image as the background asset', () => {
    const s = section({
      blockId: 'cta-banner',
      variant: 'image-bg',
      heading: 'Ready?',
      content: '![](bg.jpg)\n\nLet us talk.',
    })
    const props = extractCtaBannerProps(s)
    expect(props.background_asset).toBe('bg.jpg')
    expect(props.body).toBe('Let us talk.')
  })
})

describe('extractHeroSplitProps', () => {
  it('uses hero_image_alt when present, else the headline', () => {
    const base = {
      title: 'Acme | Tagline',
      hero_variant: 'image-right',
      hero_image: 'h.jpg',
      meta_description: 'desc',
    } as unknown as PageManifest
    expect(extractHeroSplitProps({ ...base, hero_image_alt: 'A photo' }).image_alt).toBe('A photo')
    expect(extractHeroSplitProps(base).image_alt).toBe('Acme')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assembly/extract-block-props.test.ts`
Expected: FAIL — body images not yet extracted (`props.image` is `''`, `props.body` still contains the image markdown).

- [ ] **Step 3: Update the extractors**

In `src/lib/assembly/extract-block-props.ts`, update the import from `./md-utils` to include `extractLeadingImage` (add it to the existing destructured import list at the top):

```ts
  extractTrailingCta,
  extractLeadingImage,
```

Replace `extractContentSplitProps` (lines 69-79) with:

```ts
export function extractContentSplitProps(section: PageSection): ContentSplitProps {
  const img = extractLeadingImage(section.content)
  const { body, cta } = extractTrailingCta(img.body)
  const image = img.src ?? section.image ?? ''
  return {
    variant: (section.variant as 'image-right' | 'image-left') ?? 'image-right',
    heading: section.heading,
    body,
    image,
    image_alt: img.alt ?? section.heading,
    cta,
  }
}
```

Replace `extractCtaBannerProps` (lines 123-132) with:

```ts
export function extractCtaBannerProps(section: PageSection): CtaBannerProps {
  const img = extractLeadingImage(section.content)
  const { body, cta } = extractTrailingCta(img.body)
  return {
    variant: (section.variant as 'color-bg' | 'image-bg') ?? 'color-bg',
    heading: section.heading,
    body: body.trim() || undefined,
    background_asset: img.src ?? section.image,
    cta_primary: cta,
  }
}
```

Replace `extractChecklistSectionProps` (lines 328-340) with:

```ts
export function extractChecklistSectionProps(section: PageSection): ChecklistSectionProps {
  const img = extractLeadingImage(section.content)
  const { body, cta } = extractTrailingCta(img.body)
  const { intro, items } = parseSimpleBulletList(body)
  const image = img.src ?? section.image
  return {
    variant: (section.variant as ChecklistSectionProps['variant']) ?? 'standalone',
    heading: section.heading,
    intro,
    items,
    image,
    image_alt: image ? (img.alt ?? section.heading) : undefined,
    cta,
  }
}
```

Replace **only** the `image_alt` line in `extractHeroSplitProps` (line 483, `    image_alt: headline,`) with the following (leave the existing `image: manifest.hero_image ?? '',` line above it untouched — do not duplicate it):

```ts
    image_alt: manifest.hero_image_alt ?? headline,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assembly/extract-block-props.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assembly/extract-block-props.ts src/lib/assembly/extract-block-props.test.ts
git commit -m "feat(images): extract body markdown images for split/checklist/cta blocks"
```

---

## Task 5: Single-image components use `resolveImageSrc()`

No unit tests (no component-test harness); verified by typecheck in Task 12. Each edit adds the import and swaps the hardcoded path.

**Files:** `src/components/blocks/{Hero,HeroSplit,ContentSplit,ChecklistSection,CtaBanner}.tsx`

- [ ] **Step 1: Hero.tsx**

Add import after the existing imports (below line 4):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 18:

```ts
  const bgSrc = image ? `/content-assets/${image}` : undefined
```

with:

```ts
  const bgSrc = resolveImageSrc(image)
```

- [ ] **Step 2: HeroSplit.tsx**

Add import after line 5:

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 19:

```ts
  const imgSrc = image ? `/content-assets/${image}` : undefined
```

with:

```ts
  const imgSrc = resolveImageSrc(image)
```

- [ ] **Step 3: ContentSplit.tsx**

Add import after line 8 (after the `cn` import):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace the image `<div>` block (lines 39-53) with a resolved-src version:

```tsx
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
          {resolveImageSrc(image) ? (
            <Image
              src={resolveImageSrc(image)!}
              alt={image_alt}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
              Image: {image_alt || '(missing)'}
            </div>
          )}
        </div>
```

- [ ] **Step 4: ChecklistSection.tsx**

Add import after line 7 (after the `cn` import):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace the image `<div>` block (lines 68-82) with:

```tsx
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            {resolveImageSrc(image) ? (
              <Image
                src={resolveImageSrc(image)!}
                alt={image_alt ?? heading}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                Image: {image_alt ?? '(missing)'}
              </div>
            )}
          </div>
```

- [ ] **Step 5: CtaBanner.tsx**

Add import after line 7 (after `MD_LINK_COMPONENTS`):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace lines 19-22:

```ts
  const bgSrc =
    variant === 'image-bg' && background_asset
      ? `/content-assets/${background_asset}`
      : undefined
```

with:

```ts
  const bgSrc = variant === 'image-bg' ? resolveImageSrc(background_asset) : undefined
```

- [ ] **Step 6: Typecheck the touched files**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/blocks/Hero.tsx src/components/blocks/HeroSplit.tsx src/components/blocks/ContentSplit.tsx src/components/blocks/ChecklistSection.tsx src/components/blocks/CtaBanner.tsx
git commit -m "refactor(images): resolve single-image blocks via resolveImageSrc"
```

---

## Task 6: ServiceCards per-card image support

ServiceCards currently renders no image even though its prop type has `image?`. Add image capture in `parseH3CardList` and render it.

**Files:**
- Modify: `src/lib/assembly/md-utils.ts` (`parseH3CardList`)
- Modify: `src/components/blocks/ServiceCards.tsx`
- Test: `src/lib/assembly/md-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/assembly/md-utils.test.ts` (add `parseH3CardList` to the import if not present):

```ts
describe('parseH3CardList image capture', () => {
  it('captures a leading markdown image per card', () => {
    const body = '### Tax Prep\n![Tax desk](tax.jpg)\nYear-round planning.\n\n### Audit\nAssurance work.'
    const { cards } = parseH3CardList(body)
    expect(cards[0].image).toBe('tax.jpg')
    expect(cards[0].description).toBe('Year-round planning.')
    expect(cards[1].image).toBeUndefined()
  })

  it('captures a `photo:` line per card', () => {
    const body = '### Payroll\nphoto: payroll.jpg\nOn-time every cycle.'
    const { cards } = parseH3CardList(body)
    expect(cards[0].image).toBe('payroll.jpg')
    expect(cards[0].description).toBe('On-time every cycle.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assembly/md-utils.test.ts -t "image capture"`
Expected: FAIL — `cards[0].image` is `undefined`.

- [ ] **Step 3: Extend `parseH3CardList`**

In `src/lib/assembly/md-utils.ts`, replace `parseH3CardList` (lines 271-289) with:

```ts
export function parseH3CardList(body: string): {
  intro?: string
  cards: Array<{ title: string; description: string; url?: string; image?: string }>
} {
  const { intro, chunks } = parseTitleBodyChunks(body)
  const cards = chunks.map(({ title, body: rawRest }) => {
    // A card image may be a leading markdown image or a `photo:` line.
    let image: string | undefined
    let rest = rawRest
    const leading = extractLeadingImage(rest)
    if (leading.src) {
      image = leading.src
      rest = leading.body
    } else {
      const photoMatch = rest.match(/^\s*photo:\s*(\S+)\s*$/im)
      if (photoMatch) {
        image = photoMatch[1].trim()
        rest = rest.replace(photoMatch[0], '').trim()
      }
    }
    // Pop trailing link as card url
    const ctaMatch = rest.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/)
    if (ctaMatch) {
      return {
        title,
        description: rest.slice(0, ctaMatch.index).trimEnd(),
        url: ctaMatch[2],
        image,
      }
    }
    return { title, description: rest, image }
  })
  return { intro, cards }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assembly/md-utils.test.ts -t "image capture"`
Expected: PASS (2 tests).

- [ ] **Step 5: Render the image in ServiceCards.tsx**

In `src/components/blocks/ServiceCards.tsx`, add two imports after line 6 (`cn`):

```ts
import Image from 'next/image'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Add `overflow-hidden` to the `Card` className (line 33) so the top image clips to the rounded corner:

```tsx
            className="h-full flex flex-col overflow-hidden"
```

Insert an image block as the FIRST child inside `<Card …>`, immediately before `<CardHeader …>` (before line 36):

```tsx
            {card.image && (
              <div className="relative w-full aspect-video overflow-hidden">
                <Image
                  src={resolveImageSrc(card.image)!}
                  alt={card.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            )}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/assembly/md-utils.ts src/lib/assembly/md-utils.test.ts src/components/blocks/ServiceCards.tsx
git commit -m "feat(images): add per-card image support to ServiceCards"
```

---

## Task 7: Per-item & misc components use `resolveImageSrc()`

One-line `src` swaps; the guard already proves the ref is truthy, so `!` is safe. Verified by typecheck in Task 12.

**Files:** `TeamGrid.tsx`, `ContentCards.tsx`, `LogoBar.tsx`, `insights/page.tsx`, `insights/[slug]/page.tsx`, `Footer.tsx`, `NavBar.tsx`

- [ ] **Step 1: TeamGrid.tsx**

Add import after line 8 (`cn`):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 40 (`src={`/content-assets/${member.photo}`}`) with:

```tsx
                    src={resolveImageSrc(member.photo)!}
```

- [ ] **Step 2: ContentCards.tsx**

Add import after line 10 (`cn`):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 50 (`src={`/content-assets/${card.image}`}`) with:

```tsx
                    src={resolveImageSrc(card.image)!}
```

- [ ] **Step 3: LogoBar.tsx**

Add import after line 3 (`Link`):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 26 (`src={`/content-assets/${logo.src}`}`) with:

```tsx
                  src={resolveImageSrc(logo.src)!}
```

- [ ] **Step 4: insights/page.tsx**

Add import (next to the existing `Image` import near the top of the file):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 53 (`src={`/content-assets/${p.frontmatter.image}`}`) with:

```tsx
                        src={resolveImageSrc(p.frontmatter.image)!}
```

- [ ] **Step 5: insights/[slug]/page.tsx**

Add import (next to the existing `Image` import near the top of the file):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace the JSON-LD image ternary (lines 96-98):

```ts
    image: post.frontmatter.image
      ? `/content-assets/${post.frontmatter.image}`
      : undefined,
```

with:

```ts
    image: resolveImageSrc(post.frontmatter.image),
```

Replace line 136 (`src={`/content-assets/${post.frontmatter.image}`}`) with:

```tsx
              src={resolveImageSrc(post.frontmatter.image)!}
```

- [ ] **Step 6: Footer.tsx**

Add import (next to the existing `Image` import near the top of the file):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 28 (`src={`/content-assets/${brand.logo.footer}`}`) with:

```tsx
                src={resolveImageSrc(brand.logo.footer)!}
```

Replace line 36 (`src={`/content-assets/${brand.logo.primary}`}`) with:

```tsx
                src={resolveImageSrc(brand.logo.primary)!}
```

- [ ] **Step 7: NavBar.tsx**

Add import (next to the existing `Image` import near the top of the file):

```ts
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
```

Replace line 64 (`src={`/content-assets/${brand.logo.primary}`}`) with:

```tsx
              src={resolveImageSrc(brand.logo.primary)!}
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/blocks/TeamGrid.tsx src/components/blocks/ContentCards.tsx src/components/blocks/LogoBar.tsx src/app/insights/page.tsx "src/app/insights/[slug]/page.tsx" src/components/footer/Footer.tsx src/components/nav/NavBar.tsx
git commit -m "refactor(images): resolve per-item and brand-logo images via resolveImageSrc"
```

---

## Task 8: Enable remote images in `next.config.ts`

**Files:** Modify `next.config.ts`

- [ ] **Step 1: Add the `images` config**

In `next.config.ts`, add an `images` block inside `nextConfig`, immediately after `cacheComponents: true,` (line 140):

```ts
  cacheComponents: true,
  // Allow next/image to optimize author-supplied remote images (image: URLs in
  // content). CSP img-src already permits `https:` (see buildCsp above), so no
  // CSP change is needed. Local images live under public/content-assets/.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
```

- [ ] **Step 2: Verify the config compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(images): allow remote https images via next/image remotePatterns"
```

---

## Task 9: Asset folder, placeholder generator, and sample images

**Files:**
- Create: `public/content-assets/.gitkeep`
- Create: `scripts/generate-placeholder.ts`
- Create (generated): `public/content-assets/hero-office.png`, `public/content-assets/team-photo.png`
- Modify: `content/pages/home.md`

- [ ] **Step 1: Create the asset directory marker**

```bash
mkdir -p public/content-assets
touch public/content-assets/.gitkeep
```

- [ ] **Step 2: Write the placeholder generator**

Create `scripts/generate-placeholder.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Generate solid-color placeholder PNGs into public/content-assets/.
 * Pure Node (zlib) — no image libraries. Used to keep the template rendering
 * cleanly before a client supplies real photography.
 *
 * Usage:
 *   tsx scripts/generate-placeholder.ts                       # template defaults
 *   tsx scripts/generate-placeholder.ts out.png 1600 900 #1f2937
 */
import { deflateSync } from 'node:zlib'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function solidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type 2 = truecolor RGB
  const rowLen = width * 3
  const raw = Buffer.alloc((rowLen + 1) * height)
  for (let y = 0; y < height; y++) {
    const off = y * (rowLen + 1)
    raw[off] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3
      raw[p] = rgb[0]; raw[p + 1] = rgb[1]; raw[p + 2] = rgb[2]
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function write(file: string, w: number, h: number, hex: string): Promise<void> {
  const outDir = path.join(process.cwd(), 'public', 'content-assets')
  await fs.mkdir(outDir, { recursive: true })
  const out = path.join(outDir, file)
  await fs.writeFile(out, solidPng(w, h, hexToRgb(hex)))
  console.log(`✓ ${file} (${w}×${h}, ${hex})`)
}

async function main(): Promise<void> {
  const [, , file, w, h, hex] = process.argv
  if (file && w && h && hex) {
    await write(file, Number(w), Number(h), hex)
    return
  }
  // Template defaults — match the references shipped in content/pages/home.md.
  await write('hero-office.png', 1600, 900, '#1f2937')
  await write('team-photo.png', 1200, 900, '#334155')
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
```

- [ ] **Step 3: Generate the placeholders**

Run: `npx --yes tsx scripts/generate-placeholder.ts`
Expected output:
```
✓ hero-office.png (1600×900, #1f2937)
✓ team-photo.png (1200×900, #334155)
```

- [ ] **Step 4: Verify they are valid PNGs**

Run: `file public/content-assets/hero-office.png public/content-assets/team-photo.png`
Expected: each reported as `PNG image data, ... 8-bit/color RGB`.

- [ ] **Step 5: Update `content/pages/home.md` to the new method**

In `content/pages/home.md`, change the hero image reference (line 11):

```
hero_image: hero-office.png
hero_image_alt: The Korbey Lague office in Tyngsborough
```

Replace the content-split block (lines 26-29) to demonstrate the `![alt](src)` syntax (note the dropped `| image:` attribute):

```markdown
<!-- block: content-split | variant: image-right -->
## Built on Relationships, Not Transactions

![The Korbey Lague partner team in their Tyngsborough office](team-photo.png)

When you call us, you get the partner who knows your business — not a rotating cast of associates. That's been our promise for fifty years and it's not changing.
```

- [ ] **Step 6: Commit**

```bash
git add public/content-assets/.gitkeep public/content-assets/hero-office.png public/content-assets/team-photo.png scripts/generate-placeholder.ts content/pages/home.md
git commit -m "feat(images): add content-assets folder, placeholder generator, sample images"
```

---

## Task 10: Validation handles remote `hero_image` URLs

`validate-deliverable.ts` already parses `![alt](src)` and skips URLs, but `hero_image` is checked for local existence unconditionally. Make it skip `http(s)` URLs too.

**Files:** Modify `scripts/validate-deliverable.ts`

- [ ] **Step 1: Update the hero_image check**

In `scripts/validate-deliverable.ts`, replace the `hero_image` block (lines 63-74) with:

```ts
      // Frontmatter: hero_image field (skip remote URLs)
      if (typeof data.hero_image === 'string' && data.hero_image) {
        const img = data.hero_image
        const isRemote = img.startsWith('http://') || img.startsWith('https://')
        if (!isRemote) {
          referencedImages.add(img)
          if (!(await exists(path.join(assetsDir, img)))) {
            findings.push({
              severity: 'warning',
              file: `pages/${file}`,
              message: `hero_image "${img}" missing in public/content-assets/`,
            })
          }
        }
      }
```

- [ ] **Step 2: Run validate against the template**

Run: `npm run validate`
Expected: exit 0, no `team-photo`/`hero-office` warnings (placeholders exist), final line reports pages validated and images referenced.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-deliverable.ts
git commit -m "fix(validate): skip remote URLs for hero_image existence check"
```

---

## Task 11: Documentation

**Files:** Modify `docs/blocks.md`, `docs/authoring-content.md`, `docs/architecture.md`

- [ ] **Step 1: Update `docs/blocks.md` annotation reference**

In `docs/blocks.md`, under the block-annotation reference (around lines 18-26 where `image` is described), add a paragraph after the `image` bullet:

```markdown
**Including an image (preferred):** write a standard Markdown image as the first
line of the block body. The alt text and source both come from one line, and the
source can be a local filename **or** a full `https://` URL:

```markdown
<!-- block: content-split | variant: image-right -->
## Built on Relationships

![Our team in the office](team-photo.png)

When you call us, you get the partner who knows your business…
```

Local filenames resolve under `public/content-assets/`. The `| image: <file>`
comment attribute still works as a fallback. Remote URLs require no extra config
(`next/image` `remotePatterns` and CSP `img-src https:` already allow them).
```

- [ ] **Step 2: Update `docs/authoring-content.md`**

In `docs/authoring-content.md`, replace the image guidance (lines 215-216, "If you include an `image:` entry…") with:

```markdown
4. **To include an image**, write a Markdown image as the first line of the
   block body: `![descriptive alt text](filename.png)`. The file must exist at
   `public/content-assets/<filename>` (upload via GitHub's file uploader), or
   you can use a full `https://` URL instead of a filename. Hero images are set
   in frontmatter via `hero_image:` / `hero_image_alt:`. The older
   `| image: <file>` comment attribute still works.
```

- [ ] **Step 3: Update `docs/architecture.md`**

Append a new section to `docs/architecture.md`:

```markdown
## Images

Authored image references resolve through one helper,
`src/lib/assembly/resolve-image.ts` (`resolveImageSrc`): a bare filename becomes
`/content-assets/<file>` (served from `public/content-assets/`), while an
`http(s)` URL or an absolute path is passed through unchanged. Every block
component and the insights pages call it instead of hardcoding the asset path.

Single-image blocks (`content-split`, `checklist-section`, `cta-banner`) accept
the image as the first Markdown image in the body; `extractLeadingImage`
(`md-utils.ts`) lifts it out and strips it from the rendered prose, with the
`| image:` comment attribute kept as a fallback. Hero images come from
`hero_image` / `hero_image_alt` frontmatter. Per-item blocks (`team-grid`,
`service-cards`, `content-cards`, `logo-bar`) carry per-item refs through the
same resolver.

Remote images are enabled by `images.remotePatterns` in `next.config.ts`. The
CSP `img-src` directive already includes `https:`, so remote origins are not
blocked — the trade-off is that any HTTPS image origin is permitted, which is
the standard posture for author-supplied images and low-risk for `img-src`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/blocks.md docs/authoring-content.md docs/architecture.md
git commit -m "docs(images): document the ![alt](src) method, URLs, and resolver"
```

---

## Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Unit tests**

Run: `npm test`
Expected: all suites pass, including the new `resolve-image`, `extractLeadingImage`, `parseH3CardList image capture`, and `extract-block-props` tests.

- [ ] **Step 4: Validate the deliverable**

Run: `npm run validate`
Expected: exit 0, no missing-image warnings for the shipped content.

- [ ] **Step 5: Production build**

Run: `npm run build`
Expected: build succeeds; `/` prerenders without image errors.

- [ ] **Step 6: Spot-check in the browser (optional but recommended)**

Run: `npm run dev`, open `http://localhost:3000/`. Confirm the hero shows the
dark placeholder background and the "Built on Relationships" section shows the
team placeholder image (no broken-image icon, no `Image: (missing)` text).

- [ ] **Step 7: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test(images): verification fixes"
```

---

## Notes for the implementer

- **`extractLeadingImage` runs before `extractTrailingCta`** in the single-image
  extractors. This matters: `extractTrailingCta`'s regex would otherwise match
  the `[…](…)` inside an `![…](…)` image at the end of a body. Removing the image
  first prevents that.
- **`!` non-null assertions** in component `src={resolveImageSrc(x)!}` are safe
  because they sit behind a truthiness guard on the same ref (`x ? …` or
  `{x && …}`); `resolveImageSrc` only returns `undefined` for empty/undefined.
- **No component-test harness exists** — component correctness is covered by
  `tsc --noEmit` + `npm run build`. All new logic lives in pure functions that
  are unit-tested.
- **Don't touch** `src/app/layout.tsx:59` — it builds an absolute OG image URL
  via `new URL(...)`, which needs the full path, not the resolver's relative
  output.
```

