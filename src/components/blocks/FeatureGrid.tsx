import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Icon } from './Icon'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { FeatureGridProps } from '@/lib/assembly/extract-block-props'

export type { FeatureGridProps }

export function FeatureGrid({ variant, heading, intro, items }: FeatureGridProps) {
  const colsClass =
    variant === '4-col'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <Section dataBlock="feature-grid">
      <header className="max-w-2xl mx-auto text-center">
        <h2
          className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
        >
          {heading}
        </h2>
        {intro && (
          <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
        )}
      </header>
      <div className={cn('mt-12 grid gap-6', colsClass)}>
        {items.map((item, i) => (
          <Card key={i} className="h-full p-6 flex flex-col items-start gap-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-action) 14%, transparent)',
              }}
            >
              <Icon name={item.icon} className="h-6 w-6" />
            </div>
            <h3
              className="font-heading font-semibold text-lg"
            >
              {item.title}
            </h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              {item.description}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  )
}
