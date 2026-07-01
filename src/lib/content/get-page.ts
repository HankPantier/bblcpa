import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'

/**
 * Convert a URL path to a .md filename in content/pages/.
 *   /                          → home.md
 *   /services                  → services.md
 *   /services/virtual-cfo      → services--virtual-cfo.md
 *   /industries/nonprofits     → industries--nonprofits.md
 */
export function pageUrlToFilename(url: string): string {
  const stripped = url.replace(/^\//, '').replace(/\/$/, '')
  if (!stripped) return 'home.md'
  return `${stripped.replace(/\//g, '--')}.md`
}

/**
 * Read a page markdown file by URL. Returns the raw .md content (frontmatter
 * + body), or null when no such page exists — callers translate null into
 * their own 404 (`notFound()` for pages, a 404 response for routes).
 *
 * Missing-file is a RETURN VALUE here, not a throw, on purpose: this function
 * is 'use cache', and errors thrown inside a cached scope are not cacheable.
 * Under cacheComponents, a route whose generateStaticParams returns real
 * entries renders unknown params via a runtime prerender; an uncacheable
 * throw makes that prerender re-execute the IO and fail with
 * DYNAMIC_SERVER_USAGE, escalating what should be a 404 into a 500. A cached
 * null avoids all of that (and spares a disk hit per repeat miss). Non-ENOENT
 * errors (permissions, I/O) still throw — those are genuine 500s.
 *
 * 'use cache' keeps pages prerenderable under cacheComponents: true. Cache
 * key includes the url argument, so each page gets its own entry.
 */
export async function getPageMarkdown(url: string): Promise<string | null> {
  'use cache'
  cacheLife('max')
  const filename = pageUrlToFilename(url)
  const filePath = path.join(process.cwd(), 'content', 'pages', filename)
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/**
 * List all page slugs available under content/pages/. Used by
 * generateStaticParams in the dynamic [...slug] route.
 */
export async function listPageSlugs(): Promise<string[]> {
  'use cache'
  cacheLife('max')
  const dir = path.join(process.cwd(), 'content', 'pages')
  const entries = await fs.readdir(dir)
  return entries
    .filter(f => f.endsWith('.md'))
    .map(f => f.slice(0, -3))  // drop .md
    .filter(slug => slug !== 'home')   // home is handled by app/page.tsx, not [...slug]
}
