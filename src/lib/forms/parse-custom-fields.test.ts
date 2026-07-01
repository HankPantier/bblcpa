import { describe, it, expect } from 'vitest'
import { parseCustomFields } from './parse-custom-fields'

describe('parseCustomFields', () => {
  it('returns [] for empty input', () => {
    expect(parseCustomFields('')).toEqual([])
    expect(parseCustomFields('Just some prose, no list.')).toEqual([])
  })

  it('parses the basic shape from the plan example', () => {
    const md = `Intro prose paragraph before the list.

- name: text required label="Your name"
- email: email required
- company: text label="Company"
- budget: select [Under $10k, $10k-$50k, $50k+]
- timeline: text label="When are you hoping to start?"
- message: textarea required label="Tell us about your project"
`
    const fields = parseCustomFields(md)
    expect(fields).toHaveLength(6)

    expect(fields[0]).toEqual({
      name: 'name',
      type: 'text',
      required: true,
      label: 'Your name',
      placeholder: undefined,
      options: undefined,
    })
    expect(fields[1]).toEqual({
      name: 'email',
      type: 'email',
      required: true,
      label: 'Email',
      placeholder: undefined,
      options: undefined,
    })
    expect(fields[2]).toEqual({
      name: 'company',
      type: 'text',
      required: false,
      label: 'Company',
      placeholder: undefined,
      options: undefined,
    })
    expect(fields[3]).toEqual({
      name: 'budget',
      type: 'select',
      required: false,
      label: 'Budget',
      placeholder: undefined,
      options: ['Under $10k', '$10k-$50k', '$50k+'],
    })
    expect(fields[5]).toEqual({
      name: 'message',
      type: 'textarea',
      required: true,
      label: 'Tell us about your project',
      placeholder: undefined,
      options: undefined,
    })
  })

  it('humanizes names without explicit labels', () => {
    const md = `- first_name: text required
- preferred_contact_method: text`
    const fields = parseCustomFields(md)
    expect(fields[0].label).toBe('First Name')
    expect(fields[1].label).toBe('Preferred Contact Method')
  })

  it('accepts placeholder attribute alongside label', () => {
    const md = `- name: text required label="Full name" placeholder="Jane Doe"`
    const fields = parseCustomFields(md)
    expect(fields[0].label).toBe('Full name')
    expect(fields[0].placeholder).toBe('Jane Doe')
  })

  it('skips malformed lines and keeps valid ones', () => {
    const md = `- name: text required
- not even a field line
- email: email required
- bogus_type: octopus required
- phone: tel`
    const fields = parseCustomFields(md)
    expect(fields.map(f => f.name)).toEqual(['name', 'email', 'phone'])
  })

  it('handles single-quoted attribute values', () => {
    const md = `- title: text label='Job title'`
    const fields = parseCustomFields(md)
    expect(fields[0].label).toBe('Job title')
  })

  it('only parses select options for select type', () => {
    const md = `- accept: checkbox required label="I agree" [yes,no]`
    const fields = parseCustomFields(md)
    // Options are stripped before type parsing, so type=checkbox should
    // not retain options
    expect(fields[0].type).toBe('checkbox')
    expect(fields[0].options).toBeUndefined()
  })
})
