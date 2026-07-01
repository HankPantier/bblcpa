# OG Images

Nothing to do here. The site template generates branded Open Graph /
social-share cards dynamically at:

    <site-origin>/api/og/<page-path>

(e.g. /api/og/services/virtual-cfo-advisory) — built per page from the
frontmatter title/description and brand palette. No static PNGs are required;
the `og_image` frontmatter field points at this route.

This folder exists only as a place to drop custom static cards if a client
ever wants hand-designed ones — that would also require pointing the page
metadata at them in the template (src/components/assembly/
GeneratedMarkdownPage.tsx), which currently always uses /api/og.
