import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type SectionProps = {
  children: ReactNode
  fullBleed?: boolean
  bg?: 'none' | 'surface' | 'primary' | 'action' | 'card'
  className?: string
  as?: 'section' | 'header' | 'footer' | 'div'
  dataBlock?: string
}

const BG_CLASSES: Record<NonNullable<SectionProps['bg']>, string> = {
  none: '',
  surface: 'bg-background',
  primary: 'bg-primary text-primary-foreground',
  action: 'bg-[color:var(--color-action,theme(colors.cyan.500))] text-white',
  card: 'bg-card text-card-foreground',
}

export function Section({
  children,
  fullBleed = false,
  bg = 'none',
  className,
  as: Tag = 'section',
  dataBlock,
}: SectionProps) {
  const bgClass = BG_CLASSES[bg]

  if (fullBleed) {
    return (
      <Tag data-block={dataBlock} className={cn(bgClass, className)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          {children}
        </div>
      </Tag>
    )
  }

  return (
    <Tag data-block={dataBlock} className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16', bgClass, className)}>
      {children}
    </Tag>
  )
}
