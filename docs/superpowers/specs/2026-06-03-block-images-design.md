# Design: First-class images across all blocks

**Date:** 2026-06-03
**Status:** Approved (pre-implementation)

## Problem

Every image-bearing block already *renders* an image — the parser extracts an
`image:` attribute from the block comment, the extractors pass it through, and
the components emit `<Image src={`/content-assets/${file}`} />`. But the method
for actually *including* an image is broken and awkward:

1. **`public/content-assets/` does not exist** (no directory, no `.gitkeep`). The
   whole convention silently assumes a "Phase I deliverable" zip dropped the
   folder in. For the template itself and for hand-authoring, every image
   reference 404s and `npm run validate` flags every image as missing.
2. **No image files** exist for the shipped content (`home.md` references
   `hero-office.jpg` and `team-photo.jpg`, neither present).
3. **The authoring syntax is awkward and undiscoverable** — declaring an image
   in an HTML comment attribute (`<!-- block: content-split | image: x.jpg -->`)
   is cramped, has no alt text, is single-image only, and easy to forget.
4. **No remote-URL support** — authors can only reference local files.
5. **Inconsistent coverage** — multi-image blocks (TeamGrid `photo:`, LogoBar
   `src:`, ContentCards `photo:`, ServiceCards) each use ad-hoc per-item
   conventions, none support URLs, and none share resolution logic.

## Goals

- A clean, discoverable authoring method for attaching images to any block.
- Support **both** local files (committed to `public/content-assets/`) and remote
  `http(s)` URLs through one syntax.
- Explicit alt text with a sensible fallback (the section heading).
- Cover **every** image surface, including hero backgrounds and per-item images.
- The shipped template renders clean (no broken images; `npm run validate`
  passes) via committed placeholder images.
- No breaking changes to already-authored content.

## Non-goals (YAGNI)

- Image upload UI / CMS.
- Automatic Pexels sourcing (the legacy `query` field is preserved untouched).
- Responsive art-direction or multiple sources per block.
- SVG handling beyond what already exists.

## Decisions (confirmed with user)

- **Primary syntax:** standard Markdown `![alt](src)` in the section body.
- **Back-compat:** the existing `| image:` comment attribute keeps working as a
  fallback; `hero_image:` frontmatter stays for page-level heroes.
- **Image location:** `public/content-assets/`, committed to the client repo,
  served natively by Next (zero build step).
- **Remote URLs:** supported in addition to local files.
- **Alt text:** explicit, falling back to the section heading.
- **Placeholders:** add committed, brand-tinted placeholder images so the
  template renders clean.

## Architecture

### 1. `resolveImageSrc()` — single source of truth

New helper `src/lib/assembly/resolve-image.ts`:

```ts
export function resolveImageSrc(ref?: string): string | undefined {
  if (!ref) return undefined
  if (/^https?:\/\//i.test(ref)) return ref          // remote, as-is
  return `/content-assets/${ref}`                     // local filename
}
```

Every component that currently hardcodes `` `/content-assets/${x}` `` (~14 sites:
Hero, HeroSplit, ContentSplit, ChecklistSection, CtaBanner, TeamGrid,
ServiceCards, ContentCards, LogoBar, Footer, NavBar, insights pages) calls this
helper instead. One place owns local-vs-URL logic.

> Note: `Footer`, `NavBar`, and brand/logo data-URL paths reference brand logos,
> not content images. They are migrated to `resolveImageSrc()` for consistency
> only where the value is a plain filename; brand `load-mark-data-url.ts`
> (filesystem read) stays as-is.

### 2. `extractLeadingImage()` — pull the first body image

New `md-utils` helper:

```ts
extractLeadingImage(body: string): { src?: string; alt?: string; body: string }
```

Matches the first standalone Markdown image (`![alt](src)`) in the body, returns
its `src`/`alt`, and returns the body with that image line removed so it does not
double-render inside the prose. If no body image is found, `src`/`alt` are
undefined and `body` is unchanged.

### 3. Coverage matrix

| Surface | Image source (in priority order) | Alt text |
|---|---|---|
| **ContentSplit** | body `![alt](src)` → `\| image:` attr | markdown alt → heading |
| **ChecklistSection** (`with-image`) | body `![alt](src)` → `\| image:` attr | markdown alt → heading |
| **CtaBanner** (`image-bg`) | body `![alt](src)` → `\| image:` attr | markdown alt → heading (decorative bg may use `""`) |
| **Hero** (background) | `hero_image:` frontmatter (filename or URL) | decorative — `alt=""` |
| **HeroSplit** (side image) | `hero_image:` frontmatter (filename or URL) | new `hero_image_alt:` → headline |
| **TeamGrid** (`photo:`) | per-member ref via `resolveImageSrc()` | existing `photo_alt` (`Photo of <name>`) |
| **ContentCards** (`photo:`) | per-card ref via `resolveImageSrc()` | card title |
| **ServiceCards** | per-card ref via `resolveImageSrc()` | card title |
| **LogoBar** (`src:`) | per-logo ref via `resolveImageSrc()` | existing `alt` |
| **Insights/blog** (`image:` frontmatter) | resolved via helper | post title |

Single-image extractors (`extractContentSplitProps`,
`extractChecklistSectionProps`, `extractCtaBannerProps`) call
`extractLeadingImage()` on the section content first, fall back to
`section.image`, and set `image_alt` from the markdown alt or the heading.

### 4. Remote-URL configuration

- `next.config.ts`: add `images.remotePatterns: [{ protocol: 'https', hostname: '**' }]`
  so `next/image` will optimize remote images.
- `buildCsp()` in `next.config.ts`: add `https:` to the `img-src` directive so
  remote images are not CSP-blocked.
- **Trade-off:** this permits any HTTPS image origin. That is the standard
  posture for author-supplied images and low-risk for `img-src`. Documented in
  `docs/architecture.md`.

### 5. Asset folder + placeholders

- Create `public/content-assets/` with a committed `.gitkeep`.
- Add `scripts/generate-placeholder.ts` — pure Node `zlib`, no new deps — that
  emits brand-tinted solid-color PNG placeholders at given dimensions.
- Generate committed placeholders for every reference in shipped content
  (`home.md`: hero background + content-split team image). Update content refs to
  match the generated filenames/extensions so the template renders clean and
  `npm run validate` passes.

### 6. Validation

Update `scripts/validate-deliverable.ts` Check 2 to:
- Recognize `![alt](src)` body images (in addition to the `| image:` attribute
  and `hero_image` frontmatter).
- **Skip** `http(s)` URLs from the local-existence check.
- Still verify that local filenames exist in `public/content-assets/`.

### 7. Documentation

- `docs/blocks.md` and `docs/authoring-content.md`: teach the `![alt](src)`
  method, URL support, alt-text behavior, and the `public/content-assets/`
  folder. Keep documenting the `| image:` attribute as the back-compat fallback.
- `docs/architecture.md`: note the CSP `img-src https:` implication and the
  `resolveImageSrc()` resolution rule.

## Data flow

```
content/pages/*.md
  └─ parsePageMd()            → PageSection { image?, content, ... }
       └─ extract*Props()
            ├─ extractLeadingImage(content)  → { src, alt, body }
            ├─ resolveImageSrc(src ?? section.image)  → "/content-assets/x" | "https://…"
            └─ image_alt = alt ?? heading
                 └─ <Image src={resolved} alt={image_alt} />
```

## Error handling

- Missing/empty ref → `resolveImageSrc` returns `undefined`; components keep
  their existing graceful placeholder (`ContentSplit` shows `Image: <alt>`; Hero
  renders no background).
- Malformed Markdown image (no closing paren etc.) → `extractLeadingImage` does
  not match; body is unchanged; falls through to the `| image:` attribute.
- Local file referenced but absent → renders a broken `<Image>` at runtime, but
  `npm run validate` catches it at CI time.

## Testing

- `resolve-image.test.ts`: local filename, `https://`, `http://`, empty/undefined.
- `md-utils.test.ts`: `extractLeadingImage` — extraction, alt capture, body
  stripping, no-match passthrough, image not at the leading position.
- Extractor tests: ContentSplit / ChecklistSection / CtaBanner pick body image
  over attribute, alt fallback to heading, URL passthrough.
- `validate-deliverable` handling: URL refs skipped, local refs still checked.
- Existing `block-registry`, parser, and route tests must stay green.

## Implementation notes

- Keep changes additive: the `| image:` attribute and `query` field stay in the
  parser regex and `PageSection` type untouched.
- `resolveImageSrc` lives in `src/lib/assembly/` alongside the other pipeline
  helpers; it is pure and dependency-free.
</content>
</invoke>
