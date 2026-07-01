import { Section } from './Section'
import { getBrandConfig } from '@/lib/brand/get-brand-config'

/**
 * Embedded Google Map for the firm's address. Reads the address from
 * content/brand.json — no markdown content needed.
 *
 *   <!-- block: map -->
 *   ## Find Us
 *
 * Uses the keyless https://www.google.com/maps?q={ADDRESS}&output=embed
 * pattern. Works for any address without provisioning a Google Maps API
 * key, at the cost of basic styling (default Google theme, single pin,
 * no theme tinting). Worth it for the zero-config experience — clients
 * who want a customized map can upgrade to the Maps Embed API later by
 * swapping the iframe src.
 *
 * Renders nothing when no address is present in brand.json so the page
 * doesn't ship an empty map frame.
 */

type Props = {
  heading: string
}

function formatAddressForQuery(brand: Awaited<ReturnType<typeof getBrandConfig>>): string | null {
  const a = brand.contact.address
  if (!a) return null
  const street = [a.street, a.line2].filter(Boolean).join(', ')
  const cityLine = [a.city, a.state, a.zip].filter(Boolean).join(' ')
  const full = [brand.firm.name, street, cityLine].filter(Boolean).join(', ')
  return full || null
}

export async function MapBlock({ heading }: Props) {
  const brand = await getBrandConfig()
  const address = formatAddressForQuery(brand)
  if (!address) return null

  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  return (
    <Section dataBlock="map">
      <header className="max-w-2xl mb-8">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
          {heading}
        </h2>
      </header>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-border">
        <iframe
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          title={`Map of ${brand.firm.name}`}
        />
      </div>
    </Section>
  )
}
