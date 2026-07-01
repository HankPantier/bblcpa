import { describe, expect, it } from 'vitest'
import { stripBlockAnnotations } from './strip-block-annotations'

describe('stripBlockAnnotations', () => {
  it('returns the empty string for empty input', () => {
    expect(stripBlockAnnotations('')).toBe('')
  })

  it('leaves markdown without annotations untouched', () => {
    const md = '# Heading\n\nSome **bold** text.\n'
    expect(stripBlockAnnotations(md)).toBe(md)
  })

  it('removes a single block annotation along with its trailing newline', () => {
    const md = [
      'Intro paragraph.',
      '',
      '<!-- block: feature-grid | variant: 3-col -->',
      '## Features',
      '',
    ].join('\n')
    expect(stripBlockAnnotations(md)).toBe(
      ['Intro paragraph.', '', '## Features', ''].join('\n')
    )
  })

  it('removes every annotation in a multi-block page', () => {
    const md = [
      '<!-- block: intro-text | variant: centered -->',
      '## Intro',
      '',
      '<!-- block: feature-grid | variant: 3-col -->',
      '- One',
      '- Two',
      '',
      '<!-- block: cta-banner | variant: color-bg -->',
      '## Ready?',
    ].join('\n')
    const out = stripBlockAnnotations(md)
    expect(out).not.toMatch(/<!--\s*block:/)
    expect(out).toContain('## Intro')
    expect(out).toContain('## Ready?')
  })

  it('handles an annotation at end-of-file with no trailing newline', () => {
    const md = 'Body\n<!-- block: feature-grid | variant: 3-col -->'
    expect(stripBlockAnnotations(md)).toBe('Body\n')
  })

  it('tolerates leading indentation on the annotation line', () => {
    const md = '  <!-- block: hero | variant: image -->\n# Hero\n'
    expect(stripBlockAnnotations(md)).toBe('# Hero\n')
  })

  it('leaves non-block HTML comments alone', () => {
    const md = '<!-- TODO: revisit -->\n\n<!-- block: cta-banner | variant: color-bg -->\nBody\n'
    const out = stripBlockAnnotations(md)
    expect(out).toContain('<!-- TODO: revisit -->')
    expect(out).not.toMatch(/<!--\s*block:/)
  })
})
