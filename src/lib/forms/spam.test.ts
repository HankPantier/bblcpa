import { describe, expect, it } from 'vitest'
import {
  HONEYPOT_FIELD,
  MIN_SUBMIT_MS,
  MAX_SUBMIT_MS,
  isHoneypotFilled,
  isSubmittedTooFast,
  scoreContent,
} from './spam'

describe('isHoneypotFilled', () => {
  it('is false for empty / undefined', () => {
    expect(isHoneypotFilled(undefined)).toBe(false)
    expect(isHoneypotFilled('')).toBe(false)
    expect(isHoneypotFilled('   ')).toBe(false)
  })
  it('is true when a bot fills it', () => {
    expect(isHoneypotFilled('http://spam.example')).toBe(true)
  })
  it('exposes a stable field name', () => {
    expect(HONEYPOT_FIELD).toBe('website')
  })
})

describe('isSubmittedTooFast', () => {
  const now = 1_000_000_000_000
  it('blocks submissions faster than the minimum', () => {
    expect(isSubmittedTooFast(now - (MIN_SUBMIT_MS - 500), now)).toBe(true)
  })
  it('allows a human-paced submission', () => {
    expect(isSubmittedTooFast(now - (MIN_SUBMIT_MS + 2000), now)).toBe(false)
  })
  it('soft-passes a missing or invalid timestamp', () => {
    expect(isSubmittedTooFast(undefined, now)).toBe(false)
    expect(isSubmittedTooFast(Number.NaN, now)).toBe(false)
  })
  it('soft-passes a stale or future timestamp (cache / clock skew)', () => {
    expect(isSubmittedTooFast(now - (MAX_SUBMIT_MS + 1), now)).toBe(false)
    expect(isSubmittedTooFast(now + 5000, now)).toBe(false)
  })
})

describe('scoreContent', () => {
  it('passes a normal inquiry clean', () => {
    const s = scoreContent({
      name: 'Jane Smith',
      email: 'jane@example.com',
      message: 'I need help with my small-business bookkeeping this quarter.',
    })
    expect(s.flag).toBe(false)
    expect(s.drop).toBe(false)
    expect(s.reasons).toHaveLength(0)
  })

  it('flags but does not drop a message with a few links', () => {
    const s = scoreContent({
      message: 'see http://a.com and http://b.com plus www.c.com',
    })
    expect(s.flag).toBe(true)
    expect(s.drop).toBe(false)
  })

  it('drops a link-flood message', () => {
    const s = scoreContent({
      message:
        'http://a.com http://b.com http://c.com http://d.com http://e.com',
    })
    expect(s.drop).toBe(true)
    expect(s.flag).toBe(true)
  })

  it('flags on spam keywords regardless of links', () => {
    const s = scoreContent({ message: 'cheap viagra and backlinks here' })
    expect(s.flag).toBe(true)
    expect(s.reasons.some((r) => r.startsWith('keywords:'))).toBe(true)
  })
})
