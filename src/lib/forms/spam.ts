/**
 * Pure, dependency-free spam heuristics for the built-in /api/contact route.
 * Imported server-side only. Three independent signals layered ahead of the
 * Vercel BotID check (which is the real defense against headless bots):
 *
 *   1. Honeypot   — a hidden field humans never fill; bots auto-fill it.
 *   2. Timing trap — humans take seconds to fill a form; bots submit instantly.
 *   3. Content     — bulk spam is link-heavy and keyword-laden.
 *
 * Honeypot + timing are near-zero false-positive for humans, so the route
 * blocks on them (covertly). Content scoring is higher false-positive, so it
 * defaults to flag-not-drop (still emails the firm, marked) and only hard-drops
 * on an extreme signal — losing a real CPA lead is worse than a flagged inbox.
 */

/** Hidden field name. Mirrored in FormFields.tsx; kept here as the source of truth. */
export const HONEYPOT_FIELD = 'website'

/** Humans don't fill a contact form in under ~3s. */
export const MIN_SUBMIT_MS = 3000
/** A timestamp older than this is stale (cached page, replay) — ignore it. */
export const MAX_SUBMIT_MS = 2 * 60 * 60 * 1000

/** Message link count at/above which we flag, and at/above which we hard-drop. */
export const URL_FLAG_THRESHOLD = 3
export const URL_DROP_THRESHOLD = 5

// Lowercase substrings strongly associated with bulk form spam. Conservative
// on purpose — these rarely appear in a legitimate accounting inquiry.
const SPAM_KEYWORDS = [
  'viagra',
  'cialis',
  'casino',
  'porn',
  'crypto giveaway',
  'forex signals',
  'seo services',
  'guest post',
  'backlinks',
  'rolex',
  '[url=',
  '[/url]',
]

const URL_PATTERN = /https?:\/\/|www\./gi

export function isHoneypotFilled(hp: string | undefined): boolean {
  return typeof hp === 'string' && hp.trim().length > 0
}

export function isSubmittedTooFast(t: number | undefined, now: number): boolean {
  // Missing/invalid timestamp → soft-pass (never block on absence). Template
  // clients always send it; a stale timestamp is treated as legitimate too.
  if (typeof t !== 'number' || !Number.isFinite(t)) return false
  const elapsed = now - t
  if (elapsed < 0 || elapsed > MAX_SUBMIT_MS) return false
  return elapsed < MIN_SUBMIT_MS
}

function countUrls(text: string): number {
  const matches = text.match(URL_PATTERN)
  return matches ? matches.length : 0
}

export type ContentScore = { drop: boolean; flag: boolean; reasons: string[] }

/**
 * Score the free-text content of a submission. Examines every string value
 * (name, message, custom textareas, etc.) for link density and spam keywords.
 */
export function scoreContent(fields: Record<string, unknown>): ContentScore {
  const reasons: string[] = []

  const blob = Object.values(fields)
    .filter((v): v is string => typeof v === 'string')
    .join('\n')
  const lower = blob.toLowerCase()

  const urlCount = countUrls(blob)
  if (urlCount >= URL_FLAG_THRESHOLD) reasons.push(`${urlCount} links`)

  const hitKeywords = SPAM_KEYWORDS.filter((kw) => lower.includes(kw))
  if (hitKeywords.length > 0) reasons.push(`keywords: ${hitKeywords.join(', ')}`)

  const drop = urlCount >= URL_DROP_THRESHOLD
  const flag = reasons.length > 0
  return { drop, flag, reasons }
}
