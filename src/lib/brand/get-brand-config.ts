import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import type { BrandJson } from './types'

// 'use cache' + cacheLife('max') tells Next that brand.json is build-time
// data. Next's cache supersedes the prior manual in-memory pattern; the
// result is reused across requests AND captured at prerender time so pages
// stay statically renderable under cacheComponents: true.
export async function getBrandConfig(): Promise<BrandJson> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'brand.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as BrandJson
}
