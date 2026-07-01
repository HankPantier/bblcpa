#!/usr/bin/env tsx
/**
 * new-client — one-command bootstrap after cloning the template.
 *
 *   git clone … <slug>-site && cd <slug>-site
 *   npm run new-client ~/Downloads/<client>-content-package.zip
 *
 * Runs: npm install → npm run unpack <zip> → npm run validate → git commit.
 * Stops at any failure with a clear pointer to what to fix. Safe to re-run:
 * `unpack` is idempotent, validate is read-only, and the commit step skips
 * cleanly when there's nothing new to commit.
 */

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n→ ${cmd} ${args.join(' ')}`)
    const child = spawn(cmd, args, { stdio: 'inherit' })
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`\`${cmd} ${args.join(' ')}\` exited with ${code}`))
    )
    child.on('error', reject)
  })
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function inGitRepo(): Promise<boolean> {
  return exists(path.join(process.cwd(), '.git'))
}

async function hasStagedOrUntracked(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('git', ['status', '--porcelain'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', (chunk) => (out += chunk.toString()))
    child.on('exit', () => resolve(out.trim().length > 0))
  })
}

async function main() {
  const zipArg = process.argv[2]
  if (!zipArg) {
    console.error(
      'Usage: npm run new-client <path-to-content-package.zip>\n' +
        'Run from inside a freshly-cloned client repo (the one you want to set up).'
    )
    process.exit(1)
  }

  const zipPath = path.resolve(zipArg)
  if (!(await exists(zipPath))) {
    console.error(`Zip not found: ${zipPath}`)
    process.exit(1)
  }

  if (!(await inGitRepo())) {
    console.error(
      'No .git directory — run this from inside a cloned client repo.\n' +
        'Step 1 (manual): git clone … <client-slug>-site && cd <client-slug>-site'
    )
    process.exit(1)
  }

  console.log(`\n=== Bootstrapping client from ${path.basename(zipPath)} ===`)

  await run('npm', ['install'])
  await run('npm', ['run', 'unpack', '--', zipPath])
  await run('npm', ['run', 'validate'])

  if (!(await hasStagedOrUntracked())) {
    console.log('\nNothing to commit — working tree clean. Done.')
    return
  }

  await run('git', ['add', '-A'])
  await run('git', ['commit', '-m', 'chore: unpack initial deliverable'])

  console.log('\n✓ Client setup complete.')
  console.log('Next: edit site.config.ts for siteUrl / legalLinks / forms / booking,')
  console.log('      set .env.local (RESEND_API_KEY, NEXT_PUBLIC_GA4_ID / _GTM_ID),')
  console.log('      then `npm run dev` and verify. See docs/how-to-new-site.md.')
}

main().catch((err: unknown) => {
  console.error('\n✗', err instanceof Error ? err.message : err)
  process.exit(1)
})
