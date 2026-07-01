# Onboarding fixes — deployability postmortem

> **Audience:** an AI coding agent running the per-client onboarding
> (`docs/setup.md`) or maintaining the admin content-packaging pipeline.
>
> **Purpose:** during the initial onboarding of the BBL CPA site
> (`HankPantier/bblcpa`), the admin-deployed content package would **not
> build**. This document records every issue found, how it was detected, the
> exact fix applied, and — most importantly — how to prevent each one so the
> onboarding runbook can be streamlined.
>
> **Date:** 2026-07-01
> **Commit that fixed it:** `fix: make packaged content deployable`
> **Net result:** `validate` → 56 pages OK · `lint`/`tsc` green · `test`
> 221/221 · `build` exit 0.

---

## TL;DR — what was wrong

The content shipped by the "Deploy packaged content via admin" step had three
build-blocking defects, plus one cosmetic note:

| # | Defect | Severity | Root cause |
|---|--------|----------|------------|
| 1 | Page files named with full URLs (`https:----www.bblcpa.com--*.md`) | **Blocks build** | Admin packager wrote crawled URLs as filenames instead of clean slugs |
| 2 | Stale template seed `home.md` (wrong firm: "Korbey Lague PLLP") shipped alongside the real homepage | **Wrong content live** | Fresh-clone seed was never removed when real content was deployed |
| 3 | 8 pages with unquoted colons in `meta_description` frontmatter | **Blocks build** | Auto-generated meta text contains `City, ST:` and `…:` without YAML quoting |
| 4 | `package-lock.json` drift (`^16.2.7` vs pinned `16.2.7`) | Cosmetic | Lockfile not regenerated after `package.json` pin |

**If the admin packager fixes #1, #2, and #3 at export time, onboarding
becomes a clean `install → validate → build` with zero manual content
surgery.**

---

## Environment context

- The repo was cloned in **existing-client state** (content already unpacked
  and committed), not fresh-clone state. `docs/setup.md` Phase 2 (`npm run
  unpack <zip>`) did **not** apply — there was no zip; content arrived via the
  admin "Deploy packaged content" commits on the `draft` branch.
- Two branches existed: `main` (seed only) and `draft` (all real content).
  `draft` was strictly ahead of `main` → clean fast-forward merge, no
  conflicts. `siteUrl` was already set to `https://www.bblcpa.com` in
  `site.config.ts`.
- Node v22.16.0, npm 10.9.2.

> **Runbook gap:** `docs/setup.md` assumes a zip-based unpack. The
> admin-deploy path (content committed to a branch, then merged) is a
> **different onboarding flow** that the runbook doesn't cover. It should.

---

## Issue 1 — Full-URL filenames break the build

### Symptom

`npm run build` failed during "Collecting page data":

```
> Build error occurred
Error: Requested and resolved page mismatch: /https://www.bblcpa.com /https:/www.bblcpa.com
```

### Root cause

Routing is **filename-based**. `src/lib/content/get-page.ts` converts between
URL paths and filenames using `--` as the path separator:

```ts
// pageUrlToFilename:  /services/virtual-cfo  →  services--virtual-cfo.md
//                     /                       →  home.md
export function pageUrlToFilename(url: string): string {
  const stripped = url.replace(/^\//, '').replace(/\/$/, '')
  if (!stripped) return 'home.md'
  return `${stripped.replace(/\//g, '--')}.md`
}
// listPageSlugs():  reads content/pages/, drops ".md", that string IS the slug
//                   (with -- meaning /), minus "home".
```

The admin packager wrote **41 files** whose names embedded the full origin,
e.g.:

```
content/pages/https:----www.bblcpa.com--what-we-do--outsourced-accounting.md
```

Decoding that filename through the `--` → `/` rule:

```
https:----www.bblcpa.com--what-we-do--outsourced-accounting
   └ https:  +  //  (from ----)  +  www.bblcpa.com  +  /what-we-do/outsourced-accounting
   = slug "https://www.bblcpa.com/what-we-do/outsourced-accounting"
```

So `generateStaticParams` emitted route params like
`/https://www.bblcpa.com/...`, which Next.js then couldn't reconcile
(`https://` collapses to `https:/` on resolution) → the mismatch error.

The **nav** (`content/nav.json`) already pointed at the correct clean paths
(`/what-we-do/outsourced-accounting`, `/who-we-are`, `/contact`,
`/resources/e-books`, …), so the *content* was right — only the *filenames*
were wrong.

### Detection

- `ls content/pages/` showed a batch of `https:----www.bblcpa.com--*.md`
  files interleaved with correctly-named files (`services.md`,
  `industries--physicians.md`, …).
- The two sets were **complementary, not duplicates**: the URL-named set
  covered `what-we-do/*`, `who-we-are`, `contact`, `privacy-policy`,
  `resources/e-books*`, `resources/quick-reads/*` (articles),
  `resources/refund-tracker`, `resources/resources-library`, and the root.
  The clean-named set covered `services`, `our-team`, `why-bbl`,
  `industries*`, `resources` (listing), `resources/quick-reads` (listing),
  `get-started`, `terms-of-use`.
- Only one true collision: the URL-named root (`https:----www.bblcpa.com--.md`)
  vs the seed `home.md` (see Issue 2).

### Fix

Strip the literal `https:----www.bblcpa.com--` prefix from every offending
filename (using `git mv` to preserve history). The root file becomes
`home.md` (replacing the stale seed):

```bash
cd content/pages
prefix='https:----www.bblcpa.com--'

# root URL-named file → home.md (see Issue 2 for why we delete the old one first)
rm home.md
git mv -- "${prefix}.md" home.md

# every other URL-named file → clean slug
for f in "${prefix}"*.md; do
  git mv -- "$f" "${f#$prefix}"
done
```

### Verification that renaming was safe (do this before renaming)

- Confirmed routing is purely filename-based (`get-page.ts` above); the
  frontmatter `url:` field is **not** used for routing.
- Confirmed the canonical tag uses the separate `canonical_url` frontmatter
  field (`src/app/page.tsx` → `alternates.canonical`), which was already
  correct (`https://www.bblcpa.com/...`). So leaving the full-URL `url:` values
  in frontmatter is harmless cosmetic metadata.
- `scripts/validate-deliverable.ts` round-trips each filename
  (filename → URL → filename) and warns on ambiguous `--` patterns — a good
  post-fix check.

### Prevention (highest leverage)

**The admin content packager must emit clean slug filenames, not URLs.** When
exporting a crawled page at `https://www.bblcpa.com/what-we-do/tax`:

1. Strip scheme + host → `/what-we-do/tax`
2. Apply the repo's own `pageUrlToFilename()` → `what-we-do--tax.md`
3. Root path `/` → `home.md`

Reusing the repo's `pageUrlToFilename()` at packaging time guarantees a clean
round-trip. Failing that, a one-line guard in the setup runbook:

```bash
# Fail fast if any page filename embeds a scheme/host.
ls content/pages/ | grep -E '^https?:' && { echo "URL-named page files detected"; exit 1; }
```

---

## Issue 2 — Stale template seed homepage

### Symptom

`content/pages/home.md` described **"Korbey Lague PLLP — Boutique CPA Firm in
Tyngsborough, MA"** — an entirely different (template-seed) firm — while the
real BBL homepage lived in the URL-named root file
`https:----www.bblcpa.com--.md`.

If shipped, the live site's homepage would show the wrong firm.

### Root cause

The template's fresh-clone seed (`home.md`) is supposed to be **overwritten**
when real content is deployed. The admin deploy added the real homepage under a
URL-named file instead of replacing `home.md`, leaving both.

### Detection

`head -30` on both files:

- `home.md` → `title: Korbey Lague PLLP …`, `canonical_url:
  https://korbeylague.com/` (wrong firm).
- `https:----www.bblcpa.com--.md` → `title: Home | Brammer, Begnaud, &
  Lattimore …`, full BBL frontmatter (answer_block, faq_block, eeat_signals,
  internal_links). This is the real, richer homepage.

Cross-checked the other clean-named files (`services.md`, `our-team.md`,
`industries*.md`, …) — those **were** genuine BBL content, so only `home.md`
was a stale seed.

### Fix

Handled inside the Issue 1 rename: `rm home.md` then `git mv
"${prefix}.md" home.md` (the real BBL root file becomes `home.md`).

### Prevention

Admin packager should **overwrite** `home.md` when deploying a root page, and
the setup runbook should sanity-check the homepage firm name against
`content/brand.json`'s `firm.name`:

```bash
# Warn if home.md doesn't mention the actual firm.
FIRM=$(node -e "console.log(require('./content/brand.json').firm.name)")
grep -q "$FIRM" content/pages/home.md || echo "WARNING: home.md may be a stale seed (firm '$FIRM' not found)"
```

---

## Issue 3 — Unquoted colons in `meta_description` frontmatter (invalid YAML)

### Symptom

`npm run validate` aborted with a YAML parse error:

```
incomplete explicit mapping pair; a key node is missed; or followed by a
non-tabulated empty line at line 5, column 114:
  ... attimore CPAs in Port Arthur, TX: forms, deadlines, penalties, a ...
```

### Root cause

`meta_description` values are unquoted YAML scalars that contain a
**colon-space** (`: `), which YAML interprets as a nested mapping. The
generated copy commonly produces this via `City, ST: <summary>` or
`… CPAs: <list>`. Example:

```yaml
meta_description: A small business owner guide to 1099s from … in Port Arthur, TX: forms, deadlines, penalties, and common filing mistakes explained.
#                                                                          ^^ breaks YAML
```

**8 pages** were affected (all failing on line 5 = `meta_description`):

- `resources--e-books--everything-you-need-to-know-about-1099s.md`
- `resources--quick-reads--how-small-businesses-can-survive-soaring-oil-prices-and-keep-customers.md`
- `resources--quick-reads.md`
- `resources--resources-library.md`
- `resources.md`
- `services.md`
- `what-we-do--outsourced-accounting.md`
- `why-bbl.md`

### Detection

`validate` only reports the **first** failing file, so a full scan was written
to find them all at once (gray-matter is the same parser the app uses). Put the
scanner **inside the repo** (`scripts/`) so `node_modules` resolves:

```ts
// scripts/_scan-fm.ts  (temporary; delete after)
import fs from 'node:fs'; import path from 'node:path'; import matter from 'gray-matter'
const dir = path.join(process.cwd(), 'content/pages'); const bad: [string,string][] = []
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.md')) continue
  try { matter(fs.readFileSync(path.join(dir, f), 'utf8')) }
  catch (e: any) { bad.push([f, String(e.message).split('\n')[0]]) }
}
console.log(bad.length ? 'BAD:\n' + bad.map(([f,m]) => ` - ${f} => ${m}`).join('\n') : 'All frontmatter parses OK')
```

```bash
npx tsx scripts/_scan-fm.ts   # lists ALL bad files in one pass
```

### Fix

Wrap each affected `meta_description` value in double quotes. Verified none of
the values already contained a `"`, so double-quoting is safe and lossless. A
targeted script edited exactly the 8 files (replace the `meta_description:`
line with a double-quoted version), then the scanner was re-run to confirm
`All frontmatter parses OK`, and the temp scripts were deleted.

Manual equivalent for one file:

```yaml
# before
meta_description: … Port Arthur, TX: forms, deadlines, penalties, …
# after
meta_description: "… Port Arthur, TX: forms, deadlines, penalties, …"
```

### Prevention

- **Packager:** always emit string frontmatter values (`title`,
  `meta_title`, `meta_description`, `hero_*`, etc.) **double-quoted** (escaping
  embedded quotes). This is a general YAML-safety rule, not specific to
  colons.
- **Runbook:** add a full-frontmatter scan to Phase 2, right after unpack, so
  ALL bad files surface at once instead of one-per-`validate`-run:

  ```bash
  npx tsx scripts/_scan-fm.ts   # promote this to a permanent scripts/scan-frontmatter.ts
  ```

  Consider promoting the scanner to a permanent `scripts/scan-frontmatter.ts`
  and calling it from `validate-deliverable.ts`, so `npm run validate` reports
  **every** YAML failure in one run.

---

## Issue 4 — `package-lock.json` drift (cosmetic)

### Symptom

After `npm install`, `git diff package-lock.json` showed one line changed:

```diff
-        "next": "^16.2.7",
+        "next": "16.2.7",
```

### Root cause

`package.json` pins `next` to an exact `16.2.7`, but the committed lockfile
still had the caret range. npm normalized it on install.

### Fix

Nothing to do — included the corrected lockfile in the commit. Harmless and
actually more correct.

### Prevention

Run `npm install` and commit the resulting lockfile when pinning a dependency
version, so the lockfile and manifest stay in sync in the template.

---

## The exact sequence that took this repo from broken → deployable

```bash
# 0. (existing-client state; content already committed on `draft`)
git checkout main && git merge draft            # clean fast-forward

# 1. install
npm install

# 2. config (all defaults matched the client's choices here)
cp .env.example .env.local                       # values left blank; human fills later
#   site.config.ts: siteUrl already set; forms=resend default, booking=none,
#   analytics=none, csp=report-only → no edits needed

# 3. FIX Issue 1 + 2 — rename URL-named page files to clean slugs
cd content/pages
prefix='https:----www.bblcpa.com--'
rm home.md                                        # stale Korbey Lague seed
git mv -- "${prefix}.md" home.md                  # real BBL homepage
for f in "${prefix}"*.md; do git mv -- "$f" "${f#$prefix}"; done
cd ../..

# 4. FIX Issue 3 — quote the 8 broken meta_description values
#    (scan with scripts/_scan-fm.ts, quote each value, re-scan until clean)

# 5. quality gate (all green)
npm run validate        # ✓ 56 pages validated, filenames round-trip cleanly
npm run lint            # exit 0
npx tsc --noEmit        # exit 0
npm test                # 221/221
npm run build           # exit 0, 69 static pages

# 6. commit + push
git add -A
git commit -m "fix: make packaged content deployable"
git push origin main
```

---

## Recommended changes to `docs/setup.md` (streamline going forward)

1. **Add an "admin-deploy" onboarding path** alongside the zip/unpack path.
   When content arrives via committed branches (`main` + `draft`), the flow is:
   merge `draft` → `main` (verify fast-forward first), then run the quality
   gate. There is no `npm run unpack` step.

2. **Add pre-build content guards to Phase 2** (fail fast, all at once):
   - No URL-named page files:
     `ls content/pages/ | grep -E '^https?:' && exit 1`
   - Full frontmatter YAML scan (all bad files in one run), not just the
     first failure that `validate` reports.
   - Homepage firm-name sanity check against `content/brand.json`.

3. **Fix these at the source (admin packager) so the runbook never has to:**
   - Emit clean slug filenames via the repo's own `pageUrlToFilename()`.
   - Overwrite `home.md` (don't leave the seed).
   - Double-quote all string frontmatter values.

4. **Note the CSP + env follow-ups are unchanged:** ship `csp.mode:
   'report-only'`, deploy, verify clean in DevTools, then flip to `'enforce'`;
   add `RESEND_API_KEY` / analytics IDs in Vercel project settings (not just
   `.env.local`).

If items in #3 land in the packager, a future onboarding for a similar client
should be: `merge → npm install → cp .env.example .env.local → quality gate →
deploy`, with **no manual content surgery at all.**
