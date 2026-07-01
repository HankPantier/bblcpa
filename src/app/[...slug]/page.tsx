import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { listPageSlugs } from '@/lib/content/get-page'
import {
  renderGeneratedPage,
  generatedPageMetadata,
} from '@/components/assembly/GeneratedMarkdownPage'

type Props = {
  params: Promise<{ slug: string[] }>
}

function slugToUrl(slug: string[]): string {
  return '/' + slug.join('/')
}

// Cache Components requires generateStaticParams to return at least one
// entry. Use a placeholder when the content directory only has home.md
// (the fresh-clone state, before any deliverable is unpacked); the page
// handler maps it to a 404 below.
const EMPTY_PLACEHOLDER = '__no_pages__'

export async function generateStaticParams() {
  const slugs = await listPageSlugs()
  if (slugs.length === 0) {
    return [{ slug: [EMPTY_PLACEHOLDER] }]
  }
  // Each slug like "services" or "services--virtual-cfo" — convert to slug[]
  // form. We use double-dash as URL segment separator in filenames, but the
  // Next.js dynamic [...slug] expects an array of single-segment strings.
  return slugs.map(filename => {
    const segments = filename.split('--')
    return { slug: segments }
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug[0] === EMPTY_PLACEHOLDER) return { title: 'Not found' }
  const meta = await generatedPageMetadata(slugToUrl(slug), slug.join('/'))
  return meta ?? { title: 'Not found' }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  if (slug[0] === EMPTY_PLACEHOLDER) notFound()
  // Missing/malformed page → null → clean notFound(). Must NOT be a thrown
  // error: see getPageMarkdown's docstring for why a throw across the
  // 'use cache' boundary turns unknown-URL 404s into 500s.
  const rendered = await renderGeneratedPage(slugToUrl(slug))
  if (!rendered) notFound()
  return rendered
}
