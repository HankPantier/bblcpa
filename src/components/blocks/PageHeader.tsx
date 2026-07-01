import { Section } from './Section'
import { SmartLink as Link } from '@/components/ui/smart-link'
import type { PageHeaderProps } from '@/lib/assembly/extract-block-props'

export type { PageHeaderProps }

export function PageHeader({ headline, subheadline, breadcrumb }: PageHeaderProps) {
  return (
    <Section as="header" fullBleed bg="primary" className="!py-0" dataBlock="page-header">
      <div className="py-12 md:py-16">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-primary-foreground/70">
              {breadcrumb.map((crumb, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i < breadcrumb.length - 1 ? (
                    <Link
                      href={crumb.url}
                      className="hover:text-primary-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-primary-foreground">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1
          className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground"
        >
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-3 text-lg text-primary-foreground/80 leading-relaxed max-w-2xl">
            {subheadline}
          </p>
        )}
      </div>
    </Section>
  )
}
