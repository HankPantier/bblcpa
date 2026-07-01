import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import { internalizeHref } from '@/lib/links'
import type { NavItem, NavJson } from './types'

/**
 * Rewrite absolute same-site nav URLs (e.g. https://www.bblcpa.com/who-we-are)
 * to root-relative paths so nav links follow the current origin AND active-state
 * matching (which compares against usePathname) works. See src/lib/links.ts.
 */
function normalizeItem(item: NavItem): NavItem {
  return {
    ...item,
    url: internalizeHref(item.url).href,
    children: item.children?.map(normalizeItem),
  }
}

export async function getNavConfig(): Promise<NavJson> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'nav.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const nav = JSON.parse(raw) as NavJson
  return {
    ...nav,
    primary: nav.primary.map(normalizeItem),
    cta: nav.cta ? { ...nav.cta, url: internalizeHref(nav.cta.url).href } : nav.cta,
  }
}
