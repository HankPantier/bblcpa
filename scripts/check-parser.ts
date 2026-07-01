import { getPageMarkdown } from '../src/lib/content/get-page'
import { parsePageMd } from '../src/lib/assembly/parse-page-md'

async function main() {
  const md = await getPageMarkdown('/')
  if (!md) throw new Error('content/pages/home.md not found — unpack a deliverable first')
  const manifest = parsePageMd(md)
  console.log('title:', manifest.title)
  console.log('hero_block:', manifest.hero_block, manifest.hero_variant)
  console.log(
    'sections:\n  ' +
      manifest.sections
        .map(
          s =>
            `${s.position}: ${s.blockId}${s.variant ? '/' + s.variant : ''}${s.image ? ' image=' + s.image : ''} — "${s.heading}"`
        )
        .join('\n  ')
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
