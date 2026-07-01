import { ImageResponse } from 'next/og'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getPageMarkdown } from '@/lib/content/get-page'
import { parsePageMd } from '@/lib/assembly/parse-page-md'

const SIZE = { width: 1200, height: 630 }

/**
 * Single OG-image route for every page. We can't use the file-based
 * `opengraph-image.tsx` convention inside the existing `[...slug]` catch-all
 * (Next forbids segments after a catch-all), so this route handler stands in
 * for that pattern: `/api/og` → home, `/api/og/services/virtual-cfo` → that
 * subpage. `generateMetadata` in each page handler points `openGraph.images`
 * at this route.
 *
 * Reads brand colors + page frontmatter (title / meta_description); falls back
 * to brand info when the slug doesn't resolve. Always returns a 1200×630 PNG.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
): Promise<ImageResponse> {
  const { slug } = await params
  const brand = await getBrandConfig()

  let heading = brand.firm.name
  let subline = brand.firm.tagline ?? ''
  try {
    const url = slug && slug.length > 0 ? '/' + slug.join('/') : '/'
    const md = await getPageMarkdown(url)
    if (md) {
      const manifest = parsePageMd(md)
      heading = manifest.meta_title || manifest.title || heading
      subline = manifest.meta_description || subline
    }
  } catch {
    /* fall back to brand */
  }

  const cappedSubline = subline.length > 160 ? subline.slice(0, 157) + '…' : subline

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          background: brand.palette.primary,
          color: brand.palette.nearWhite,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {heading}
        </div>
        {cappedSubline && (
          <div
            style={{
              fontSize: 30,
              marginTop: 24,
              lineHeight: 1.3,
              opacity: 0.85,
            }}
          >
            {cappedSubline}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            paddingTop: 32,
            fontSize: 20,
            opacity: 0.8,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {brand.firm.name}
        </div>
      </div>
    ),
    { ...SIZE }
  )
}
