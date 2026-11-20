# @nialto-services/astro-sitemap-stylesheet

Styles the XML sitemaps that [`@astrojs/sitemap`](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
writes, so someone who opens `sitemap-index.xml` in a browser sees a tidy, readable list of the site's pages
instead of a wall of raw XML.

Sitemaps have traditionally been made readable with an XSLT stylesheet, which `@astrojs/sitemap` supports through
its `xslURL` option. Browsers are removing XSLT, and Chrome already warns on any page that uses it. CSS applies to
raw XML directly, with no transform, so this integration links each sitemap file to a CSS stylesheet instead.

## Install

```sh
pnpm add @nialto-services/astro-sitemap-stylesheet
```

It needs Astro 7 and Node 22.12 or later, and a site that uses `@astrojs/sitemap`.

## Setting up a site

Add the integration to `astro.config.*`, **after** `sitemap()`. Astro runs each integration's end-of-build step in
the order they are listed, and this one rewrites the files the sitemap integration has just written:

```js
import sitemap from '@astrojs/sitemap'
import { sitemapStylesheet } from '@nialto-services/astro-sitemap-stylesheet'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap(), sitemapStylesheet()]
})
```

If the site previously used an XSLT stylesheet, remove `xslURL` from `sitemap()` and delete the `.xsl` file from
`public/`.

If `sitemap()` is given a `filenameBase`, pass the same value here, so the integration finds its files:

```js
integrations: [sitemap({ filenameBase: 'pages' }), sitemapStylesheet({ filenameBase: 'pages' })]
```

## What it does

At the end of the build, the integration:

1. Writes the stylesheet into the build's assets directory (`_astro/` by default), named after a hash of its
   contents, such as `_astro/sitemap.1a2b3c4d.css`. It is served with the same long-lived caching as the site's
   other built assets, and a changed stylesheet gets a new URL.
2. Adds an `<?xml-stylesheet type="text/css"?>` instruction pointing at it to every `sitemap-*.xml` file, straight
   after the XML declaration.

CSS on raw XML cannot read the URLs it styles, so the stylesheet is written with the site's origin, from Astro's
`site` option, declared ahead of it. That origin is the page's heading. Without `site`, the heading reads
"Sitemap" instead.

The page shows each URL and its last modified date, numbered, in light and dark versions. Because CSS styles
the XML elements in place, the URLs are not clickable links, and mobile browsers show the page at desktop width.

### Content Security Policy

The stylesheet is served from the site's own origin, so a policy allowing `style-src 'self'` covers it.

## Licence

MIT
