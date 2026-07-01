import { NextResponse } from 'next/server'
import { getPageMarkdown } from '@/lib/content/get-page'
import { stripBlockAnnotations } from '@/lib/content/strip-block-annotations'

/**
 * Markdown endpoint for agents / LLM crawlers. Reached via the public-facing
 * `<page>.md` URLs (`/index.md`, `/services/virtual-cfo.md`, …) that
 * `src/proxy.ts` rewrites to this handler. Returns the raw `.md` source with
 * frontmatter preserved (machine-readable metadata) and block annotations
 * stripped (HTML comments that are noise to a reader).
 *
 * Optional catch-all so a single handler serves both the home page (no slug)
 * and any subpage. Data fetch goes through `getPageMarkdown`, which is
 * already `'use cache' + cacheLife('max')`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
): Promise<NextResponse> {
  const { slug } = await params
  const url = slug && slug.length > 0 ? '/' + slug.join('/') : '/'
  try {
    const md = await getPageMarkdown(url)
    if (!md) {
      return new NextResponse('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    return new NextResponse(stripBlockAnnotations(md), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        // Long s-maxage because the underlying data is build-time content
        // already cached via 'use cache'; a short browser max-age keeps tools
        // like curl/wget from holding very stale copies.
        'Cache-Control': 'public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
