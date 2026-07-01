'use client'

import { Section } from './Section'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import type { TestimonialsProps } from '@/lib/assembly/extract-block-props'

export type { TestimonialsProps }

export function Testimonials({ variant, heading, testimonials }: TestimonialsProps) {
  if (!testimonials || testimonials.length === 0) return null

  return (
    <Section bg="surface" dataBlock="testimonials">
      {heading && (
        <header className="mb-10 text-center">
          <h2
            className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
          >
            {heading}
          </h2>
        </header>
      )}

      {variant === 'carousel' ? (
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={heading ?? 'Customer testimonials'}
        >
          <CarouselLayout testimonials={testimonials} />
        </div>
      ) : (
        <GridLayout testimonials={testimonials} />
      )}
    </Section>
  )
}

type QuoteCardProps = {
  quote: string
  name: string
  title?: string
  company?: string
}

function QuoteCard({ quote, name, title, company }: QuoteCardProps) {
  return (
    <Card className="h-full flex flex-col p-6">
      <CardContent className="flex-1 p-0">
        <blockquote className="text-foreground/80 leading-relaxed italic text-base">
          &ldquo;{quote}&rdquo;
        </blockquote>
      </CardContent>
      <footer className="mt-6 pt-4 border-t border-border">
        <cite className="font-heading font-semibold text-foreground text-sm not-italic">
          {name}
          {(title || company) && (
            <span className="block font-normal text-xs text-foreground/60 mt-0.5">
              {[title, company].filter(Boolean).join(', ')}
            </span>
          )}
        </cite>
      </footer>
    </Card>
  )
}

function CarouselLayout({ testimonials }: { testimonials: TestimonialsProps['testimonials'] }) {
  return (
    <div className="relative px-12">
      <Carousel opts={{ loop: true }}>
        <CarouselContent aria-live="polite">
          {testimonials.map((t, i) => (
            <CarouselItem key={i} className="md:basis-1/2 lg:basis-2/3">
              <QuoteCard {...t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}

function GridLayout({ testimonials }: { testimonials: TestimonialsProps['testimonials'] }) {
  const colsClass = cn(
    'grid gap-6',
    testimonials.length === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'
  )
  return (
    <div className={colsClass}>
      {testimonials.map((t, i) => (
        <QuoteCard key={i} {...t} />
      ))}
    </div>
  )
}
