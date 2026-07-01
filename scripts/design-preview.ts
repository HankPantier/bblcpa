#!/usr/bin/env tsx
/**
 * design-preview — watches the inputs to the design brief and re-exports it
 * automatically when they change, so the Claude.ai handoff loop tightens.
 *
 * Pairs with `npm run dev` running in another terminal: Next dev hot-reloads
 * style edits to `content/design-overrides.css` automatically, and this
 * script regenerates `design-brief.md` whenever the underlying content,
 * brand JSON, or design tokens change — so when you paste the brief back to
 * Claude.ai it always reflects the latest state.
 */

import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = process.cwd()
const WATCH_PATHS = [
  path.join(REPO_ROOT, 'content'),
  path.join(REPO_ROOT, 'site.config.ts'),
]

let pending: NodeJS.Timeout | null = null
let running = false
let queued = false

function reexport() {
  if (running) {
    queued = true
    return
  }
  running = true
  console.log('[design-preview] Re-exporting design-brief.md...')
  const child = spawn('npx', ['tsx', 'scripts/export-design-brief.ts'], {
    stdio: 'inherit',
  })
  child.on('exit', (code) => {
    running = false
    if (code === 0) console.log('[design-preview] ✓ Brief refreshed')
    else console.log(`[design-preview] ✗ Re-export failed (exit ${code})`)
    if (queued) {
      queued = false
      reexport()
    }
  })
}

function schedule(reason: string) {
  if (pending) clearTimeout(pending)
  pending = setTimeout(() => {
    pending = null
    console.log(`[design-preview] ${reason} — refreshing`)
    reexport()
  }, 400)
}

for (const watchPath of WATCH_PATHS) {
  try {
    watch(watchPath, { recursive: true }, (_event, filename) => {
      if (!filename) return
      // Skip the brief itself + any tmp files
      const fname = String(filename)
      if (fname.endsWith('design-brief.md') || fname.startsWith('.')) return
      schedule(`${path.basename(watchPath)}/${fname} changed`)
    })
    console.log(`[design-preview] Watching ${path.relative(REPO_ROOT, watchPath)}`)
  } catch (err) {
    console.warn(
      `[design-preview] Skipped ${watchPath}:`,
      err instanceof Error ? err.message : err
    )
  }
}

console.log('[design-preview] Ctrl-C to stop.')
console.log('[design-preview] Keep `npm run dev` running in another terminal — the brief script fetches from it.')
