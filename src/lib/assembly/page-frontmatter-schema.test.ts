import { describe, expect, it } from 'vitest'
import { PageFrontmatterSchema } from './page-frontmatter-schema'

describe('PageFrontmatterSchema', () => {
  it('defaults missing string fields without throwing', () => {
    const out = PageFrontmatterSchema.parse({})
    expect(out.title).toBe('')
    expect(out.url).toBe('/')
    expect(out.schema_markup).toBe('WebPage')
  })

  it('parses a complete frontmatter unchanged', () => {
    const input = {
      title: 'A',
      url: '/a',
      meta_title: 'A',
      meta_description: 'A description',
      target_keyword: 'a',
      canonical_url: 'https://example.com/a',
      schema_markup: 'LocalBusiness',
      hero: 'hero',
      hero_variant: 'image',
      hero_image: 'a.jpg',
      hero_subhead: 'tagline',
      faq_block: [{ question: 'Q?', answer: 'A.' }],
    }
    const out = PageFrontmatterSchema.parse(input)
    expect(out).toMatchObject(input)
  })

  it('preserves unknown passthrough fields (review-only metadata)', () => {
    const out = PageFrontmatterSchema.parse({
      title: 'A',
      // a deliverable-only field we don't render but shouldn't reject
      review_status: 'approved',
    }) as Record<string, unknown>
    expect(out.review_status).toBe('approved')
  })

  it('rejects faq_block when it is not an array of {question, answer}', () => {
    expect(() =>
      PageFrontmatterSchema.parse({ title: 'A', faq_block: 'broken' })
    ).toThrow()
    expect(() =>
      PageFrontmatterSchema.parse({
        title: 'A',
        faq_block: [{ question: 'Q?' }], // missing answer
      })
    ).toThrow()
  })

  it('rejects internal_links when it is not an array of {url, anchor_text, reason}', () => {
    expect(() =>
      PageFrontmatterSchema.parse({
        title: 'A',
        internal_links: [{ url: '/a' }], // missing anchor_text + reason
      })
    ).toThrow()
  })

  it('rejects when a string field is given the wrong type', () => {
    expect(() =>
      PageFrontmatterSchema.parse({ title: 123 })
    ).toThrow()
  })

  it('accepts an optional hero_image_alt string', () => {
    const fm = PageFrontmatterSchema.parse({ hero_image_alt: 'Team in the office' })
    expect(fm.hero_image_alt).toBe('Team in the office')
  })

  it('coerces null string fields like missing ones (YAML empty values)', () => {
    // `meta_description:` with no value parses from YAML as null, not undefined.
    const fm = PageFrontmatterSchema.parse({
      title: 'A',
      meta_description: null,
      canonical_url: null,
      hero_image: null,
    })
    expect(fm.meta_description).toBe('')
    expect(fm.canonical_url).toBe('')
    expect(fm.hero_image).toBeUndefined()
  })
})
