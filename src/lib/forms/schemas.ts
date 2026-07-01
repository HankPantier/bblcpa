import { z, type ZodTypeAny } from 'zod'
import type { FieldDef } from './types'

/**
 * Zod schemas for the form subsystem. Imported by both client (Form.tsx,
 * runs on the visitor's browser) and server (/api/contact/route.ts,
 * re-validates the request body before sending email). Single source of
 * truth — never trust the client.
 */

// Shared field shapes
const requiredString = z.string().trim().min(1, 'Required')
const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email')

const optionalPhone = z
  .string()
  .trim()
  .max(40, 'Phone number is too long')
  .optional()
  .or(z.literal(''))

const requiredMessage = z
  .string()
  .trim()
  .min(10, 'Message must be at least 10 characters')
  .max(5000, 'Message must be 5,000 characters or fewer')

// Per-variant schemas
export const contactFormSchema = z.object({
  name: requiredString.max(120, 'Name is too long'),
  email: emailField,
  phone: optionalPhone,
  message: requiredMessage,
})

export const quoteFormSchema = z.object({
  name: requiredString.max(120, 'Name is too long'),
  email: emailField,
  phone: optionalPhone,
  service: requiredString,
  message: requiredMessage,
})

export const newsletterFormSchema = z.object({
  email: emailField,
})

/**
 * Build a Zod object schema from a list of custom field definitions. Used
 * both client-side (validate before submit) and server-side (re-validate
 * before sending email). Field rules mirror per-variant schemas:
 *
 *   text/textarea required → min 1 char
 *   email required → format + non-empty
 *   email optional → format if filled, allow empty
 *   tel optional → length cap, allow empty
 *   number required → coercible to number
 *   select required → one of options
 *   checkbox required → must be "on" (HTML form default)
 *
 * Pure and never throws. Always returns a valid Zod schema (empty object
 * if `fields` is empty).
 */
export function buildCustomFormSchema(fields: FieldDef[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {}

  for (const f of fields) {
    let schema: ZodTypeAny

    switch (f.type) {
      case 'email':
        schema = f.required
          ? z.string().trim().min(1, `${f.label} is required`).email('Please enter a valid email')
          : z.string().trim().email('Please enter a valid email').optional().or(z.literal(''))
        break
      case 'tel':
        schema = f.required
          ? z.string().trim().min(1, `${f.label} is required`).max(40, 'Phone number is too long')
          : z.string().trim().max(40, 'Phone number is too long').optional().or(z.literal(''))
        break
      case 'number':
        schema = f.required
          ? z.coerce.number({ message: `${f.label} must be a number` })
          : z.coerce.number().optional().or(z.literal(''))
        break
      case 'textarea':
        schema = f.required
          ? z.string().trim().min(1, `${f.label} is required`).max(5000)
          : z.string().trim().max(5000).optional().or(z.literal(''))
        break
      case 'select':
        if (f.options && f.options.length > 0) {
          // z.enum() requires a non-empty tuple — we already guarded length.
          const enumValues = f.options as [string, ...string[]]
          schema = f.required
            ? z.enum(enumValues, { message: `${f.label} is required` })
            : z.enum(enumValues).optional().or(z.literal(''))
        } else {
          schema = f.required
            ? requiredString
            : z.string().trim().optional().or(z.literal(''))
        }
        break
      case 'checkbox':
        // HTML checkboxes only submit a value when checked; the value is
        // typically "on" or the input's `value=` attribute. Accept either
        // truthy string or literal true.
        schema = f.required
          ? z.union([z.literal('on'), z.literal('true'), z.literal(true)], {
              message: `${f.label} is required`,
            })
          : z.string().optional()
        break
      case 'text':
      default:
        schema = f.required
          ? z.string().trim().min(1, `${f.label} is required`).max(500)
          : z.string().trim().max(500).optional().or(z.literal(''))
        break
    }

    shape[f.name] = schema
  }

  return z.object(shape)
}

/**
 * Resolve the right Zod schema for a built-in variant. Throws on `custom` —
 * callers must use buildCustomFormSchema with the field defs instead.
 */
export function schemaForBuiltinVariant(variant: 'contact' | 'quote' | 'newsletter') {
  switch (variant) {
    case 'contact':
      return contactFormSchema
    case 'quote':
      return quoteFormSchema
    case 'newsletter':
      return newsletterFormSchema
  }
}
