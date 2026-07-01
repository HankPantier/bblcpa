/**
 * resolve-image.ts
 * Single source of truth for turning an authored image reference into an
 * <Image src>. Pure and dependency-free so it works in both server and client
 * components.
 *
 *   undefined / empty   → undefined (callers render their graceful placeholder)
 *   "https://…"         → returned as-is (remote; needs next.config remotePatterns)
 *   "/already/a/path"   → returned as-is
 *   "team-photo.jpg"    → "/content-assets/team-photo.jpg"
 */
export function resolveImageSrc(ref?: string): string | undefined {
  if (!ref) return undefined
  const trimmed = ref.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  return `/content-assets/${trimmed}`
}
