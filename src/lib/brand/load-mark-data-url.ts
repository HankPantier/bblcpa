import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'

/**
 * Read `public/content-assets/<filename>` and return a base64 `data:` URL so the
 * file can be embedded directly inside an `ImageResponse` (no network fetch).
 * Returns `null` for any failure — missing file, unsupported extension, etc. —
 * so the favicon/apple-icon generators fall back to the initials tile.
 *
 * Cached because brand assets don't change between deploys; reading + encoding
 * a 50 KB PNG on every icon request would be silly.
 */
export async function loadMarkDataUrl(
  filename: string | undefined
): Promise<string | null> {
  'use cache'
  cacheLife('max')
  if (!filename) return null

  const ext = path.extname(filename).slice(1).toLowerCase()
  const MIME: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  }
  const mime = MIME[ext]
  if (!mime) return null

  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'content-assets',
      filename
    )
    const buf = await fs.readFile(filePath)
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
