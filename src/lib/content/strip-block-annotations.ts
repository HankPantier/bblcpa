/**
 * Strip the page-assembly block annotations from a markdown source.
 *
 * Block annotations look like:
 *   <!-- block: feature-grid | variant: 3-col -->
 *
 * They're HTML comments parsed by the block renderer to map markdown sections
 * to React blocks. They're meaningful at build time but pure noise when the
 * markdown is being read by an agent / LLM crawler. The `.md` route handler
 * runs this helper before serving so agents see clean prose with the
 * frontmatter still in place for structural cues.
 *
 * Pure, dependency-free. Leaves all other HTML comments (e.g. `<!-- TODO -->`)
 * untouched.
 */

const BLOCK_ANNOTATION_RE = /^[ \t]*<!--\s*block:[\s\S]*?-->[ \t]*\n?/gm

export function stripBlockAnnotations(md: string): string {
  return md.replace(BLOCK_ANNOTATION_RE, '')
}
