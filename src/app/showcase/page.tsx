import { notFound } from 'next/navigation'
import { BLOCK_REGISTRY, KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import { Section } from '@/components/blocks/Section'
import type { PageSection, PageManifest } from '@/lib/assembly/parse-page-md'

/**
 * Dev-only showcase route. Renders every block in BLOCK_REGISTRY with a
 * realistic sample so designers (Claude.ai handoff included) and reviewers
 * can see the visual vocabulary before any real content is unpacked.
 *
 * Production: hard 404 via notFound(). The route compiles but never serves.
 */

export const metadata = {
  title: 'Block showcase (dev)',
  robots: 'noindex,nofollow',
}

const SAMPLE_CONTENT: Record<string, string> = {
  'feature-grid': [
    '- Calculator: **Tax Strategy & Compliance** — Year-round planning, not just season-end filing.',
    '- Briefcase: **Advisory & Virtual CFO** — Financial oversight on a fractional basis.',
    '- ChartLine: **Audit & Assurance** — For nonprofits, foundations, and closely held companies.',
  ].join('\n'),
  'service-cards': [
    '### Bookkeeping',
    '',
    'Monthly cleanup, reconciliations, and management reports — done by people you can call.',
    '',
    '### Tax Preparation',
    '',
    'Federal, state, and local filings for individuals, partnerships, and S-corps.',
    '',
    '### CFO Advisory',
    '',
    'Fractional CFO services for growing businesses — forecasting, KPIs, board-ready reports.',
  ].join('\n'),
  'industry-cards': [
    '### Professional Services',
    '',
    'Law firms, consultancies, and creative agencies.',
    '',
    '### Healthcare & Dental',
    '',
    'Private practices, group practices, and clinics.',
    '',
    '### Nonprofits',
    '',
    'Foundations, 501(c)(3)s, and member organizations.',
  ].join('\n'),
  'team-grid': [
    '### Jane Korbey',
    '',
    '_Managing Partner, CPA_',
    '',
    'Forty years of public-accounting practice. Specializes in succession planning and complex partnerships.',
    '',
    '### Tom Lague',
    '',
    '_Partner, CPA, MST_',
    '',
    'Tax strategy, multistate filings, and trust + estate work.',
  ].join('\n'),
  'testimonials': [
    '> "Korbey Lague turned around our quarterly close from a three-week scramble into a four-day process."',
    '> — Sarah Chen, COO at Northstar Manufacturing',
    '',
    '> "Best CPA experience we\'ve had — actual phone calls returned the same day."',
    '> — Marcus Patel, Owner, Patel & Sons',
  ].join('\n'),
  'stats-bar': [
    '- **50+** years serving the Merrimack Valley',
    '- **200+** active business clients',
    '- **$2B+** in payroll processed annually',
  ].join('\n'),
  'checklist-section': [
    '- Year-round tax planning, not just year-end scrambles',
    '- Quarterly check-ins so you never miss a deadline',
    '- One partner per client — never bounced between associates',
    '- Plain-English explanations of what changed and why',
  ].join('\n'),
  'process-steps': [
    '**Step 1 — Discovery** Conversation about your business, goals, and current setup. No commitment.',
    '',
    '**Step 2 — Engagement** Custom scope of work, fixed fees, and a clear timeline.',
    '',
    '**Step 3 — Onboarding** Document collection, software access, and your dedicated partner introduction.',
  ].join('\n'),
  'logo-bar': [
    '- ![Client 1](placeholder.png)',
    '- ![Client 2](placeholder.png)',
    '- ![Client 3](placeholder.png)',
  ].join('\n'),
  'pricing': [
    '### Starter',
    '',
    '$300 / month',
    '',
    '- Monthly bookkeeping',
    '- Quarterly check-in',
    '- Email support',
    '',
    '### Growth',
    '',
    '$750 / month',
    '',
    '- Everything in Starter',
    '- Monthly P&L review',
    '- Phone + email support',
    '- Tax planning meeting',
  ].join('\n'),
  'content-cards': [
    '### When to hire a CFO',
    '',
    'Signs your business has outgrown a bookkeeper and needs strategic financial leadership.',
    '',
    '### Year-end tax tips for S-corps',
    '',
    'A short list of moves to make before December 31 to lower your liability.',
  ].join('\n'),
  'content-table': [
    '| Service | Starter | Growth | Enterprise |',
    '|---|---|---|---|',
    '| Bookkeeping | ✓ | ✓ | ✓ |',
    '| Tax prep | — | ✓ | ✓ |',
    '| CFO advisory | — | — | ✓ |',
  ].join('\n'),
  'resource-list': [
    '- [Year-End Tax Checklist](/resources/year-end-checklist.pdf) — A printable checklist of documents you\'ll need for filing.',
    '- [Quarterly Compliance Calendar](/resources/compliance-calendar.pdf) — All your filing deadlines on one page.',
  ].join('\n'),
  'intro-text': 'A short, centered paragraph that sets up the rest of the page. Usually one or two sentences explaining the firm\'s positioning.',
  'content-prose': 'Free-form prose for longer-form sections. Supports **markdown** including [links](/contact), lists, and quotes.',
  'cta-banner': 'A short call to action — usually a single sentence + a button URL underneath.',
  'faq-accordion': '',
}

function makeSection(blockId: string): PageSection {
  return {
    blockId,
    heading: blockId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    content: SAMPLE_CONTENT[blockId] ?? '',
    position: 0,
  }
}

function makeManifest(): PageManifest {
  return {
    title: 'Showcase',
    url: '/showcase',
    meta_title: 'Showcase',
    meta_description: '',
    target_keyword: '',
    canonical_url: '',
    schema_markup: 'WebPage',
    hero_block: 'page-header',
    sections: [],
    faq_block: [
      { question: 'Do you serve clients outside Massachusetts?', answer: 'Yes — we work with clients across New England and beyond.' },
      { question: 'Do you offer fixed-fee engagements?', answer: 'For most recurring work, yes. We scope every engagement up front.' },
    ],
  }
}

export default function Showcase() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const manifest = makeManifest()

  return (
    <>
      <Section>
        <h1 className="font-heading text-4xl font-semibold text-foreground">Block showcase</h1>
        <p className="mt-3 text-foreground/70">
          Every block in the registry, rendered once with synthetic-but-realistic
          content. Dev-only — returns 404 in production builds. Useful for
          designers (Claude.ai brief handoff) and reviewers previewing the
          visual vocabulary before real content is unpacked.
        </p>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          {KNOWN_BLOCK_IDS.length} blocks · sorted alphabetically
        </p>
      </Section>

      {KNOWN_BLOCK_IDS.map((id) => {
        const render = BLOCK_REGISTRY[id]
        if (!render) return null
        return (
          <div key={id} data-showcase-block={id}>
            <Section as="div" className="!py-4 border-t border-border">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {id}
              </p>
            </Section>
            {render(makeSection(id), manifest)}
          </div>
        )
      })}
    </>
  )
}
