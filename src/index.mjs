/**
 * Styles the XML sitemaps `@astrojs/sitemap` writes for people who open them in a browser, using a CSS stylesheet.
 *
 * Browsers are removing XSLT, and Chrome already warns on any page that uses it, so the sitemap can no longer be
 * transformed into HTML for display. CSS applies to raw XML with no transform at all. `@astrojs/sitemap` can only
 * reference a stylesheet as `type="text/xsl"`, so this integration adds the `<?xml-stylesheet?>` processing
 * instruction to the files it wrote instead.
 *
 * The stylesheet (`sitemap-stylesheet.css`, beside this file) is written into the build output rather than served
 * from `public/`, so the site's origin can be declared ahead of it as `--sitemap-site` for the heading: CSS on raw XML
 * cannot read the URLs it styles. It is written to the build's assets directory under a content hash, so it shares
 * that directory's long-lived immutable caching and a changed stylesheet is a new URL rather than a stale cached one.
 *
 * It reads the files `@astrojs/sitemap` leaves in the build output, so it must be listed after that integration:
 * Astro runs each `astro:build:done` hook in turn, in the order of the array.
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const XML_DECLARATION_PATTERN = /^<\?xml[^?]*\?>/
const STYLESHEET_SOURCE_URL = new URL('./sitemap-stylesheet.css', import.meta.url)

/** Returns the XML with a CSS stylesheet processing instruction straight after its declaration. */
function withStylesheet(xml, href) {
  const instruction = `<?xml-stylesheet type="text/css" href="${href}"?>`
  const declaration = xml.match(XML_DECLARATION_PATTERN)?.[0]
  if (!declaration) return instruction + xml

  return declaration + instruction + xml.slice(declaration.length)
}

/**
 * Returns the stylesheet with the site's origin declared ahead of it as `--sitemap-site`. Without a site the
 * stylesheet is returned unchanged, and its headings fall back to their generic wording.
 */
function withSiteOrigin(css, site) {
  if (!site) return css

  return `:root {\n  --sitemap-site: ${JSON.stringify(new URL(site).origin)};\n}\n\n${css}`
}

/** Returns the stylesheet's filename, carrying a short hash of its contents. */
function hashedFilename(css) {
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 8)

  return `sitemap.${hash}.css`
}

/**
 * @param {{ filenameBase?: string }} [options]
 * @returns {import('astro').AstroIntegration}
 */
export function sitemapStylesheet({ filenameBase = 'sitemap' } = {}) {
  let site
  let base = '/'
  let assetsDir = '_astro'

  return {
    name: '@nialto-services/astro-sitemap-stylesheet',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site
        base = config.base
        assetsDir = config.build.assets
      },
      'astro:build:done': async ({ dir, logger }) => {
        const outputDir = fileURLToPath(dir)
        const filenames = (await readdir(outputDir)).filter(
          (filename) => filename.startsWith(`${filenameBase}-`) && filename.endsWith('.xml')
        )
        if (filenames.length === 0) {
          logger.warn(`No \`${filenameBase}-*.xml\` files found; is this listed after the sitemap integration?`)
          return
        }

        const css = withSiteOrigin(await readFile(STYLESHEET_SOURCE_URL, 'utf-8'), site)
        const filename = hashedFilename(css)
        const href = posix.join(base, assetsDir, filename)
        await mkdir(join(outputDir, assetsDir), { recursive: true })
        await writeFile(join(outputDir, assetsDir, filename), css)

        for (const filename of filenames) {
          const path = join(outputDir, filename)
          const xml = await readFile(path, 'utf-8')
          await writeFile(path, withStylesheet(xml, href))
        }

        logger.info(`Linked ${filenames.length} sitemap file(s) to \`${href}\``)
      }
    }
  }
}
