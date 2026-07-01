import { Section } from './Section'
import { Mail, Phone, Printer, MapPin, Clock } from 'lucide-react'
import { getBrandConfig } from '@/lib/brand/get-brand-config'

/**
 * Contact info block — reads phone, email, fax, address, and hours directly
 * from content/brand.json. No markdown content is required; the block
 * annotation just needs to exist (with a heading for SEO/AIO):
 *
 *   <!-- block: contact-info -->
 *   ## Contact Information
 *
 * This is structural by design — phone/email/hours/address are deterministic
 * structured data, not the kind of thing Claude should be free-writing into
 * markdown prose. Eliminates the bug where Claude hallucinated fake numbers
 * like "(978) 555-0100" into the page.
 *
 * Layout: left column has phone/email/fax (linkable); right column has
 * address + hours. Both columns stack on mobile.
 */

type Props = {
  heading: string
}

export async function ContactInfo({ heading }: Props) {
  const brand = await getBrandConfig()
  const { contact, firm } = brand

  const addressLines = (() => {
    const a = contact.address
    if (!a) return []
    const street = [a.street, a.line2].filter(Boolean).join(', ')
    const cityLine = [a.city, a.state, a.zip].filter(Boolean).join(', ').replace(/, ([A-Z]{2}),/, ', $1 ')
    return [street, cityLine].filter(Boolean)
  })()

  const hasReachOut = contact.phone || contact.email || contact.fax
  const hasLocation = addressLines.length > 0 || (contact.hours && Object.keys(contact.hours).length > 0)

  return (
    <Section dataBlock="contact-info">
      <header className="max-w-2xl mb-10">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
          {heading}
        </h2>
      </header>

      <div className="grid gap-10 md:gap-16 md:grid-cols-2">
        {hasReachOut && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Reach out</h3>
            <dl className="space-y-3 text-foreground/85">
              {contact.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>
                      <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary">
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {contact.email && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a href={`mailto:${contact.email}`} className="hover:text-primary">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {contact.fax && (
                <div className="flex items-start gap-3">
                  <Printer className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Fax</dt>
                    <dd>{contact.fax}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        )}

        {hasLocation && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Visit</h3>
            <div className="space-y-4 text-foreground/85">
              {addressLines.length > 0 && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <address className="not-italic" itemScope itemType="https://schema.org/PostalAddress">
                    <span className="sr-only">{firm.name} address: </span>
                    {addressLines.map((line, i) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                  </address>
                </div>
              )}
              {contact.hours && Object.keys(contact.hours).length > 0 && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <dl className="space-y-1">
                    <dt className="sr-only">Hours</dt>
                    {Object.entries(contact.hours).map(([label, value]) => (
                      <dd key={label}>
                        <span className="font-semibold">{label}:</span>{' '}
                        <span>{value}</span>
                      </dd>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
