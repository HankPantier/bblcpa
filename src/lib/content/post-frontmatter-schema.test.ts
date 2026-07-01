import { describe, expect, it } from 'vitest'
import { PostFrontmatterSchema } from './post-frontmatter-schema'

describe('PostFrontmatterSchema', () => {
  it('parses a typical post frontmatter', () => {
    const out = PostFrontmatterSchema.parse({
      title: 'Year-end tax tips for small businesses',
      excerpt: 'A quick rundown of what to handle before December 31.',
      date: '2026-11-04',
      author: 'Jane Korbey, CPA',
      image: 'year-end-tips.jpg',
      tags: ['tax', 'small business'],
    })
    expect(out.title).toBe('Year-end tax tips for small businesses')
    expect(out.tags).toEqual(['tax', 'small business'])
  })

  it('rejects when title is missing or empty', () => {
    expect(() => PostFrontmatterSchema.parse({})).toThrow()
    expect(() => PostFrontmatterSchema.parse({ title: '' })).toThrow()
  })

  it('rejects when tags is not an array of strings', () => {
    expect(() =>
      PostFrontmatterSchema.parse({ title: 'A', tags: 'not an array' })
    ).toThrow()
  })

  it('defaults excerpt + date when omitted', () => {
    const out = PostFrontmatterSchema.parse({ title: 'A' })
    expect(out.excerpt).toBe('')
    expect(out.date).toBe('')
  })
})
