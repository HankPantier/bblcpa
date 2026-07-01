import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { cacheLife } from 'next/cache'
import { PostFrontmatterSchema, type PostFrontmatter } from './post-frontmatter-schema'

const POSTS_DIR = () => path.join(process.cwd(), 'content', 'posts')

export type Post = {
  slug: string
  frontmatter: PostFrontmatter
  body: string
}

export type PostMeta = {
  slug: string
  frontmatter: PostFrontmatter
}

/**
 * List all post slugs (filename minus `.md`) in content/posts/. Returns an
 * empty array — never throws — when the directory doesn't exist (fresh-clone
 * state, before any insights are unpacked).
 */
export async function listPostSlugs(): Promise<string[]> {
  'use cache'
  cacheLife('max')
  try {
    const entries = await fs.readdir(POSTS_DIR())
    return entries.filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
  } catch {
    return []
  }
}

/**
 * Read a single post by slug. Returns null when the file is missing; the page
 * handler translates null into notFound(). Missing-file must be a return
 * value, not a throw, because errors thrown inside a 'use cache' scope are
 * not cacheable and escalate unknown-slug requests from 404 to 500 under
 * cacheComponents' runtime prerender — see getPageMarkdown in get-page.ts
 * for the full rationale. Malformed frontmatter (Zod) still throws: that's a
 * genuine content bug, caught by `npm run validate` at CI time.
 */
export async function getPost(slug: string): Promise<Post | null> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(POSTS_DIR(), `${slug}.md`)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
  const parsed = matter(raw)
  const frontmatter = PostFrontmatterSchema.parse(parsed.data)
  return {
    slug: frontmatter.slug || slug,
    frontmatter,
    body: parsed.content,
  }
}

/**
 * Lightweight metadata-only listing for the /insights index: reads every
 * post's frontmatter (skips the body) and returns them sorted newest-first by
 * `date` (string compare works for ISO YYYY-MM-DD).
 */
export async function listPostsMeta(): Promise<PostMeta[]> {
  'use cache'
  cacheLife('max')
  const slugs = await listPostSlugs()
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const raw = await fs.readFile(path.join(POSTS_DIR(), `${slug}.md`), 'utf-8')
      const parsed = matter(raw)
      const frontmatter = PostFrontmatterSchema.parse(parsed.data)
      return { slug: frontmatter.slug || slug, frontmatter }
    })
  )
  return entries.sort((a, b) => {
    const da = a.frontmatter.date || ''
    const db = b.frontmatter.date || ''
    return db.localeCompare(da)
  })
}

/**
 * Up to three related posts for the detail page: tag-overlap matches first,
 * padded with the most recent remaining posts. Excludes the current slug.
 */
export async function relatedPosts(slug: string, tags?: string[]): Promise<PostMeta[]> {
  'use cache'
  cacheLife('max')
  const others = (await listPostsMeta()).filter((p) => p.slug !== slug)
  if (others.length === 0) return []
  const tagSet = new Set((tags ?? []).map((t) => t.toLowerCase()))
  const scored = others.map((p) => ({
    post: p,
    shared: (p.frontmatter.tags ?? []).filter((t) => tagSet.has(t.toLowerCase())).length,
  }))
  const matched = scored.filter((s) => s.shared > 0).sort((a, b) => b.shared - a.shared)
  const rest = scored.filter((s) => s.shared === 0)
  return [...matched, ...rest].slice(0, 3).map((s) => s.post)
}
