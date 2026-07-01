# Sample content

Reference samples for the blog (`/insights`) and the resource-list lead-magnet block. Nothing in this directory is rendered by the site — files have to be copied into their live locations to take effect.

These samples are deliberately kept **outside `content/` and `public/`** so they're never touched when an operator runs `npm run unpack` against a deliverable.

## Activating a sample blog post

```bash
cp samples/posts/2026-09-15-year-end-tax-tips.md content/posts/
npm run dev
# visit http://localhost:3000/insights
```

The sample is dated 2026-09-15 so it sorts to a sensible position; the file name and frontmatter `slug` together determine the URL (`/insights/year-end-tax-tips`).

## Activating a sample resource

```bash
cp samples/resources/year-end-tax-checklist.md public/resources/
# then add a `<!-- block: resource-list -->` annotation to any page's .md
# pointing at /resources/year-end-tax-checklist.md
```

Resource files in `public/resources/` are served at `/resources/<filename>` and referenced from any page's `resource-list` block — see [`docs/blocks.md → resource-list`](../docs/blocks.md#resource-list).

## When to delete the samples directory

Once the firm has real content + real PDFs, this directory is just extra weight in the repo. Operators can delete `samples/` entirely from a client clone — nothing in the running site references it.
