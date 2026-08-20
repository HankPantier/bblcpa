import Link from 'next/link'
import { Download } from 'lucide-react'
import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Form } from './Form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ResourceListProps } from '@/lib/assembly/extract-block-props'

export type { ResourceListProps }

/**
 * Lead-magnet / resource library block.
 *
 * Renders downloadable resources (PDFs, templates, etc.) as a card grid, with
 * a newsletter signup form rendered immediately below. Files live in
 * `public/resources/`; the markdown lists them as `- [Title](/resources/file.pdf) — description`.
 *
 * Resources are *ungated* by design — visitors can grab the file directly.
 * The newsletter signup is the soft conversion ask, not a wall. Clients who
 * want strict gating can swap this for a custom form variant later.
 */
export function ResourceList({ heading, intro, resources }: ResourceListProps) {
  if (!resources || resources.length === 0) return null

  return (
    <>
      <Section dataBlock="resource-list">
        <header className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
            {heading}
          </h2>
          {intro && (
            <InlineProse
              text={intro}
              className="mt-3 text-foreground/70 leading-relaxed"
            />
          )}
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((r, i) => (
            <Card key={i} className="h-full flex flex-col">
              <CardContent className="flex-1 pt-6 pb-5">
                <h3 className="font-heading text-lg font-semibold text-foreground leading-snug">
                  {r.title}
                </h3>
                {r.description && (
                  <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                    {r.description}
                  </p>
                )}
              </CardContent>
              <div className="px-6 pb-6">
                <Button asChild variant="outline" className="w-full">
                  <Link href={r.url} download>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Download
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Form
        variant="newsletter"
        heading="Get more resources in your inbox"
        intro="One short email a month with new resources and seasonal updates. Never spam."
      />
    </>
  )
}
