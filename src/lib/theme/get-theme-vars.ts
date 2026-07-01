import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import type { DesignJson } from './types'

export async function getDesignConfig(): Promise<DesignJson> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'design.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as DesignJson
}
