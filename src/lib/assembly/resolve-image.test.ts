import { describe, it, expect } from 'vitest'
import { resolveImageSrc } from './resolve-image'

describe('resolveImageSrc', () => {
  it('returns undefined for empty/undefined', () => {
    expect(resolveImageSrc(undefined)).toBeUndefined()
    expect(resolveImageSrc('')).toBeUndefined()
    expect(resolveImageSrc('   ')).toBeUndefined()
  })

  it('prefixes a bare filename with /content-assets/', () => {
    expect(resolveImageSrc('team-photo.jpg')).toBe('/content-assets/team-photo.jpg')
    expect(resolveImageSrc('  hero.png  ')).toBe('/content-assets/hero.png')
  })

  it('passes http(s) URLs through unchanged', () => {
    expect(resolveImageSrc('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
    expect(resolveImageSrc('http://example.com/b.png')).toBe('http://example.com/b.png')
  })

  it('passes absolute paths through unchanged', () => {
    expect(resolveImageSrc('/content-assets/x.png')).toBe('/content-assets/x.png')
    expect(resolveImageSrc('/local.svg')).toBe('/local.svg')
  })
})
