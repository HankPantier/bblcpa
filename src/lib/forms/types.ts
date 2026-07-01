/**
 * Shared types for the form subsystem. Used by both client (Form.tsx) and
 * server (/api/contact/route.ts), plus the markdown parser and the email
 * composer.
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'

export type FieldDef = {
  /** Form field name (also the markdown name on the left of the colon). Used in payload + error map keys. */
  name: string
  type: FieldType
  required: boolean
  /** Display label. Defaults to a humanized version of `name` if missing in markdown. */
  label: string
  /** Optional placeholder hint shown inside the input when empty. */
  placeholder?: string
  /** Options for `select` fields, in declared order. Ignored for other types. */
  options?: string[]
}

export type FormVariant = 'contact' | 'quote' | 'newsletter' | 'custom'

export type FormSubmitPayload = {
  variant: FormVariant
  fields: Record<string, string>
  /** Required when variant === 'custom'; the server rebuilds the validation schema from these defs. */
  fieldDefs?: FieldDef[]
  /** Honeypot value. Lives at the top level (not in `fields`) so the Zod schemas, which strip unknown keys, never discard it before the spam check runs. Always empty for humans. */
  hp?: string
  /** Form-mount epoch ms, used by the timing trap. Top-level for the same reason as `hp`. */
  t?: number
}

export type FormSubmitResponse =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
