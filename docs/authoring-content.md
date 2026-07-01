# Editing your site content

For the firm staff who want to update copy, add a team member, or publish a
quick insight without going through a developer.

> Audience note for maintainers: this doc is intentionally written for the
> *client* (the firm) — non-technical voice, fewer references to "the
> deliverable" or "the assembly pipeline." Drop this URL into a follow-up
> email after handoff so the firm can self-serve small edits.

---

## What you can change yourself

Anything in the **`content/`** folder of your site repository. Specifically:

- **Page text** (e.g. service descriptions, the "About" page) — files inside
  `content/pages/`
- **Firm info** (phone, address, tagline) — `content/brand.json`
- **The top menu** — `content/nav.json`
- **Blog posts ("Insights")** — files inside `content/posts/`
- **301 redirects** when you move a page or retire a URL — `content/redirects.csv`

Anything outside `content/` is **template code** — that's the developer's job.
If you're not sure, ask first.

---

## How a change goes live

The short version: edit on GitHub → save → the site rebuilds within ~60
seconds → done.

The mechanics:

1. **You make a change in GitHub** (the website's repository), either via the
   in-browser editor or by sending the file to a dev who commits it.
2. **Saving** creates a "commit" — a snapshot of the change.
3. **Vercel** (the hosting service) sees the new commit, kicks off a build,
   and replaces the live site once the build passes.
4. **Within about a minute**, refreshing the live site shows your change.

If the build fails for any reason, the live site stays on the previous version.
You'll get an email about the failure if your email is on the Vercel project.

---

## Editing page text

Each page is a Markdown file in `content/pages/`. The home page is `home.md`;
sub-pages mirror the URL with `--` instead of `/` (so
`/services/virtual-cfo` is `services--virtual-cfo.md`).

### A typical page looks like this:

```markdown
---
title: "Virtual CFO Services | <Your Firm>"
meta_description: "Fractional CFO support for growing businesses..."
hero: hero
hero_variant: image
hero_image: virtual-cfo.jpg
hero_subhead: "Strategic financial leadership without a full-time hire."
---

<!-- block: intro-text | variant: centered -->
## Strategic finance, on demand

A short paragraph introducing the service goes here. Two or three sentences
is ideal.

<!-- block: feature-grid | variant: 3-col -->
## What's included

- Calculator: **Monthly close & reporting** — Clean books delivered by the 10th of every month.
- ChartLine: **Quarterly board prep** — KPIs and narrative for your board pack.
- Briefcase: **Strategic planning** — Forecasts, scenario models, and runway analysis.
```

**The bits inside `---` at the top** ("frontmatter") control the page's title,
meta description (what shows up in Google search results), and the hero
(top of the page). Edit those carefully — the **`title`** is what shows up in
the browser tab, **`meta_description`** is what shows up in Google.

**The bits inside `<!-- block: ... -->`** are layout instructions — they tell
the site how to render the section. **Don't remove them** even if you don't
understand them. Editing the text under each block is safe.

For a full list of which blocks exist and how to use them, see
[`docs/blocks.md`](./blocks.md).

### Safe edits

- Change the **headlines** (lines starting with `## `).
- Change the **paragraph text** between block annotations.
- Change items in bulleted lists (lines starting with `- `).
- Update prices, phone numbers in body copy.

### Risky edits (ask a developer first)

- Adding a brand-new block to a page (you need to know which `block:` id and
  what shape the body has — `docs/blocks.md` has the reference, but it's easy
  to typo).
- Reordering blocks across the page.
- Anything in `<!-- block: ... -->` annotations.
- Anything outside `content/`.

---

## Updating firm info (phone, address, etc.)

Open `content/brand.json`. It's a structured file — be careful to preserve
the quotes, commas, and braces.

```json
{
  "firm": {
    "name": "<Your Firm>",
    "tagline": "...",
    "foundingYear": "..."
  },
  "contact": {
    "address": {
      "street": "...",
      "city": "...",
      "state": "..",
      "zip": "....."
    },
    "phone": "...-...-....",
    "email": "info@..."
  },
  ...
}
```

Change the value (the part *inside* the quotes), not the key (the part
*before* the colon). After saving, the new info will appear in the navbar,
footer, contact page, and search-engine listings within a minute.

If you accidentally remove a comma or a quote, the build will fail and the
live site won't update — you'll see the error in your Vercel email. Revert
the change in GitHub's history if you can't fix it.

---

## Editing the top menu

`content/nav.json` is the navigation menu (the row of links at the top of
every page).

```json
{
  "primary": [
    { "label": "Services", "url": "/services" },
    {
      "label": "Industries",
      "url": "/industries",
      "children": [
        { "label": "Healthcare", "url": "/industries/healthcare" },
        { "label": "Nonprofits", "url": "/industries/nonprofits" }
      ]
    },
    { "label": "About", "url": "/about" },
    { "label": "Contact", "url": "/contact" }
  ],
  "cta": { "label": "Book a Call", "url": "/contact" }
}
```

- **`label`** is the visible text.
- **`url`** is the page it links to. Has to start with `/`. To check a URL
  exists, just visit `<your-site>.com<url>` in the browser.
- **`children`** is the dropdown under a top item (one level deep only — no
  sub-sub menus).
- **`cta`** is the prominent button at the right of the navbar (e.g. "Book
  a Call"). Optional.

To **add a menu item**, copy one of the existing entries (including the
surrounding braces and the trailing comma), then change the label + URL.
The order in this file is the order shown in the menu.

---

## Publishing a blog post / insight

Insights live in `content/posts/`. Each post is a single Markdown file.

1. **Pick a filename.** Convention: `YYYY-MM-DD-short-slug.md`. The date in
   the filename is informational; the actual published date is in the
   frontmatter.

2. **Create the file** with the following frontmatter at the top, then your
   post body below:

   ```markdown
   ---
   title: "Your post title"
   slug: short-url-friendly-slug
   excerpt: "One-sentence summary for the index card and OG share."
   date: "2027-01-15"
   author: "Your Name, CPA"
   image: "optional-hero-image.jpg"
   tags:
     - tax
     - small business
   ---

   Your post body in regular Markdown — paragraphs, **bold**, [links](/contact),
   bullet lists, and ## subheadings all work.
   ```

3. **`slug`** becomes the URL: `/resources/short-url-friendly-slug`. Keep it
   short and stable — once published, changing it breaks any inbound link.

4. **`image:`** in the frontmatter sets the post's hero image. The file must
   exist at `public/content-assets/<filename>` — upload it via GitHub's file
   uploader — or use a full `https://` URL instead of a filename. The
   `hero_image_alt:` frontmatter key sets the alt text for the hero.

   To include an image **inside a block body** (on regular pages, not just posts),
   write a Markdown image as the first line of the block body:
   `![descriptive alt text](filename.png)`. The same filename/URL rules apply.
   The older `| image: <file>` comment attribute still works as a fallback.

5. **`tags`** are not displayed yet but are searchable in the file and useful
   for future filtering.

6. Save the file. Within ~60 seconds, the post is live at
   `/resources/<slug>`, sorted in date order on `/resources`, and listed in
   the RSS feed at `/feed.xml`.

A working sample post is in `samples/posts/` you can copy and edit.

---

## Adding a downloadable resource (PDF, checklist, etc.)

Resources are files in `public/resources/`. Once a file is there, any page's
`<!-- block: resource-list -->` annotation can link it.

1. **Upload the file** to `public/resources/` via GitHub's file uploader.
   PDFs are the most common; any file type works.
2. **Add a bullet to the page** with the resource-list block:

   ```markdown
   <!-- block: resource-list -->
   ## Free resources

   A short pitch goes here.

   - [Year-End Tax Checklist](/resources/year-end-tax-checklist.pdf) — A printable checklist of documents you'll need for filing.
   - [Quarterly Compliance Calendar](/resources/compliance-calendar.pdf) — All your filing deadlines on one page.
   ```

The site renders each bullet as a card with a download button. A newsletter
signup form appears right below the card grid — visitors can grab the file
without signing up, and the signup is offered as a follow-up.

---

## Redirecting an old URL

When a page is renamed or removed, add a row to `content/redirects.csv`:

```csv
old_url,new_url,status_code,reason
/old-services,/services,301,renamed
/team-old,/about/team,301,moved
```

- **`old_url`** is the URL you want to redirect *from* (relative).
- **`new_url`** is where it should go. Must start with `/`.
- **`status_code`** is informational (the system always uses 301-equivalent
  permanent redirects). Leave it as `301`.
- **`reason`** is for your own future reference.

Save. The next deploy registers the redirect — Google will eventually update
its index.

---

## When something breaks

- **The live site is fine, but my edit hasn't shown up.** Wait another
  minute (the build may still be running). If it's been more than 5 minutes,
  check your email — Vercel sends a build-failure notification.
- **The build failed.** Vercel's email includes a link to the build log;
  the error message at the bottom usually points at the file and line.
  Most often: a missing comma in `.json`, a typo in frontmatter, or a
  removed `<!-- block: ... -->` annotation.
- **I made a change I want to undo.** GitHub's commit history lets you
  revert any change. The "..." menu next to a commit has "Revert this commit"
  — it creates a new commit that undoes the change.

When in doubt, the safe move is: **revert the change** and reach out to your
developer.

---

## What this site does that you don't have to manage

Just so you know what *is* automatic, so you don't worry about it:

- **Spam protection on the contact form** — handled automatically; multiple
  layers stop bots without you doing anything.
- **Favicon, share images** — generated from your brand colors automatically.
  No need to upload icons or per-page social-share PNGs.
- **Sitemap, robots.txt, RSS feed** — generated automatically from your
  content. Always up to date.
- **Mobile + retina rendering** — automatic.
- **Performance** — the site uses static pre-rendering and edge caching;
  load times stay fast as content grows.

If you want a deeper look at any of these, ask your developer for the
[architecture guide](./architecture.md).
