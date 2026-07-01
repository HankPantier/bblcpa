import type { FieldDef, FormVariant } from './types'

/**
 * Build the subject line + plain-text body for a form-submission email.
 * Recipient is the firm; rich HTML is overkill — plain text renders
 * everywhere, including SMS forwarding and screen readers.
 */

const VARIANT_LABEL: Record<FormVariant, string> = {
  contact: 'contact form',
  quote: 'quote request',
  newsletter: 'newsletter signup',
  custom: 'form submission',
}

export function buildEmailSubject(
  variant: FormVariant,
  firmName: string,
  submitterName?: string
): string {
  const who = submitterName?.trim() || 'website visitor'
  const label = VARIANT_LABEL[variant] ?? 'form submission'
  return `New ${label} for ${firmName} from ${who}`
}

/**
 * Build a plain-text email body listing each submitted field. Fields are
 * rendered in the order their definitions were declared (for custom forms)
 * or in a sensible default order (for built-in variants). Empty optional
 * fields are omitted to keep the email scannable.
 */
export function buildEmailBody(
  fields: Record<string, string>,
  fieldDefs?: FieldDef[]
): string {
  const lines: string[] = []
  const ordered = fieldDefs
    ? fieldDefs.map(d => ({ key: d.name, label: d.label }))
    : Object.keys(fields).map(k => ({ key: k, label: humanizeName(k) }))

  for (const { key, label } of ordered) {
    const value = (fields[key] ?? '').trim()
    if (!value) continue
    // For textarea-shaped fields, put the value on its own block
    if (value.includes('\n')) {
      lines.push(`${label}:`)
      lines.push(value)
      lines.push('')
    } else {
      lines.push(`${label}: ${value}`)
    }
  }

  if (lines.length === 0) {
    lines.push('(no fields submitted)')
  }

  lines.push('')
  lines.push('—')
  lines.push('Submitted via website contact form.')

  return lines.join('\n')
}

function humanizeName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}
