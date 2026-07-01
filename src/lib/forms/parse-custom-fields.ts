import type { FieldDef, FieldType } from './types'

/**
 * Parse a custom-form field declaration block from a `form | variant: custom`
 * section's markdown body. Grammar (one field per markdown list item):
 *
 *   - <name>: <type> [required] [label="<display>"] [placeholder="<hint>"] [options for select]
 *
 * Example body:
 *
 *   - name: text required label="Your name"
 *   - email: email required
 *   - company: text label="Company"
 *   - budget: select [Under $10k, $10k-$50k, $50k+]
 *   - timeline: text label="When are you hoping to start?"
 *   - message: textarea required label="Tell us about your project"
 *
 * Types: text, email, tel, number, textarea, select, checkbox.
 *
 * Pure and never throws. Skips lines that don't conform (logs a warning to
 * keep author feedback visible during dev). Returns the parsed FieldDef[]
 * in declaration order.
 */

const KNOWN_TYPES: ReadonlySet<FieldType> = new Set([
  'text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox',
])

function humanizeName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export function parseCustomFields(markdown: string): FieldDef[] {
  if (!markdown) return []

  // Capture each list-item line; markdown bullets are "- " or "* "
  const lines = markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*]\s+/.test(l))

  const fields: FieldDef[] = []

  for (const raw of lines) {
    const line = raw.replace(/^[-*]\s+/, '')

    // Split on the first colon — `name: type ...`
    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) {
      console.warn(`[parse-custom-fields] skipped (no colon): ${raw}`)
      continue
    }

    const name = line.slice(0, colonIdx).trim()
    if (!/^[a-z][a-z0-9_]*$/i.test(name)) {
      console.warn(`[parse-custom-fields] skipped (bad name): ${raw}`)
      continue
    }

    let tail = line.slice(colonIdx + 1).trim()

    // Pull select options like `[opt a, opt b, opt c]` if present, anywhere
    // in the tail. Strip them out so the rest of the parse doesn't see them.
    let options: string[] | undefined
    const optsMatch = tail.match(/\[([^\]]+)\]/)
    if (optsMatch) {
      options = optsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      tail = (tail.slice(0, optsMatch.index!) + tail.slice(optsMatch.index! + optsMatch[0].length)).trim()
    }

    // Pull quoted attributes label="..." and placeholder="..." (or single quotes)
    const attr = (key: 'label' | 'placeholder'): string | undefined => {
      const re = new RegExp(`${key}=(?:"([^"]+)"|'([^']+)')`)
      const m = tail.match(re)
      if (!m) return undefined
      tail = (tail.slice(0, m.index!) + tail.slice(m.index! + m[0].length)).trim()
      return (m[1] ?? m[2]).trim()
    }
    const label = attr('label')
    const placeholder = attr('placeholder')

    // Remaining bare tokens — type + optional flags
    const tokens = tail.split(/\s+/).filter(Boolean)
    const typeTok = tokens.shift()?.toLowerCase()
    if (!typeTok || !KNOWN_TYPES.has(typeTok as FieldType)) {
      console.warn(`[parse-custom-fields] skipped (unknown type "${typeTok}"): ${raw}`)
      continue
    }
    const type = typeTok as FieldType
    const required = tokens.includes('required')

    fields.push({
      name,
      type,
      required,
      label: label ?? humanizeName(name),
      placeholder,
      options: type === 'select' ? options : undefined,
    })
  }

  return fields
}
