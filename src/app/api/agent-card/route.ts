import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { siteConfig } from '../../../../site.config'

/**
 * A2A Agent Card at `/.well-known/agent.json`. Forward-looking discovery
 * endpoint for agent-to-agent protocols — gives a crawler/agent a structured,
 * machine-readable handle on "who runs this site" without parsing HTML.
 *
 * The format the A2A spec settles on is still in flux; this emits the stable
 * core (name, description, url, type, contact) plus a `serves` block listing
 * the agent-discoverable resources the site already exposes (llms.txt, the
 * .md page-companion endpoint, the RSS feed). Update as the spec stabilizes.
 */
export async function GET(): Promise<Response> {
  const brand = await getBrandConfig()
  const baseUrl = siteConfig.siteUrl.replace(/\/$/, '')

  const card = {
    name: brand.firm.name,
    description: brand.firm.tagline,
    url: baseUrl,
    type: 'Organization',
    foundingYear: brand.firm.foundingYear,
    contact: {
      email: brand.contact.email,
      phone: brand.contact.phone,
    },
    address: brand.contact.address
      ? {
          streetAddress: brand.contact.address.street,
          locality: brand.contact.address.city,
          region: brand.contact.address.state,
          postalCode: brand.contact.address.zip,
        }
      : undefined,
    sameAs: brand.social.map((s) => s.url).filter(Boolean),
    /**
     * Resources an agent can crawl in machine-readable form. Documented at
     * the same URL conventions advertised by our global Link headers (see
     * next.config.ts).
     */
    serves: [
      { rel: 'describedby', type: 'text/markdown', href: `${baseUrl}/llms.txt` },
      { rel: 'sitemap', type: 'application/xml', href: `${baseUrl}/sitemap.xml` },
      { rel: 'alternate', type: 'application/rss+xml', href: `${baseUrl}/feed.xml` },
      { rel: 'alternate', type: 'text/markdown', href: `${baseUrl}/index.md`, note: 'Every <page> is also served at <page>.md' },
    ],
  }

  return new Response(JSON.stringify(card, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Long s-maxage — brand info changes rarely; CDN caches for 1 day.
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
