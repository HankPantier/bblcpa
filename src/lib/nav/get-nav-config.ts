import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import type { NavJson } from './types'

export async function getNavConfig(): Promise<NavJson> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'nav.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as NavJson
}
