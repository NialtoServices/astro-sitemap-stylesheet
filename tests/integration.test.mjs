import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sitemapStylesheet } from '../src/index.mjs'

const DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'
const URLSET = '<urlset><url><loc>https://example.com/</loc></url></urlset>'
const SITEMAP_INDEX = '<sitemapindex><sitemap><loc>https://example.com/sitemap-0.xml</loc></sitemap></sitemapindex>'
const STYLESHEET_HREF_PATTERN = /<\?xml-stylesheet type="text\/css" href="([^"]+)"\?>/

let outputDir
let messages

beforeEach(async () => {
  outputDir = await mkdtemp(join(tmpdir(), 'astro-sitemap-stylesheet-'))
  messages = { info: [], warn: [] }
})

afterEach(async () => {
  await rm(outputDir, { recursive: true, force: true })
})

/** Runs the integration's hooks the way an `astro build` would, against the files in the output directory. */
async function build({ options, ...overrides } = {}) {
  const { site, base, assets } = { site: 'https://example.com/', base: '/', assets: '_astro', ...overrides }
  const integration = sitemapStylesheet(options)
  const logger = {
    info: (message) => messages.info.push(message),
    warn: (message) => messages.warn.push(message)
  }
  integration.hooks['astro:config:done']({ config: { site, base, build: { assets } } })
  await integration.hooks['astro:build:done']({ dir: pathToFileURL(`${outputDir}/`), logger })
}

const output = (path) => readFile(join(outputDir, path), 'utf-8')

describe('sitemapStylesheet', () => {
  it('is expected to link every sitemap file to the stylesheet straight after its XML declaration', async () => {
    await writeFile(join(outputDir, 'sitemap-index.xml'), DECLARATION + SITEMAP_INDEX)
    await writeFile(join(outputDir, 'sitemap-0.xml'), DECLARATION + URLSET)

    await build()

    const index = await output('sitemap-index.xml')
    const href = index.match(STYLESHEET_HREF_PATTERN)[1]
    expect(href).toMatch(/^\/_astro\/sitemap\.[0-9a-f]{8}\.css$/)
    expect(index).toBe(`${DECLARATION}<?xml-stylesheet type="text/css" href="${href}"?>${SITEMAP_INDEX}`)
    expect(await output('sitemap-0.xml')).toBe(
      `${DECLARATION}<?xml-stylesheet type="text/css" href="${href}"?>${URLSET}`
    )
  })

  it('is expected to start a sitemap with no XML declaration on the instruction', async () => {
    await writeFile(join(outputDir, 'sitemap-0.xml'), URLSET)

    await build()

    expect(await output('sitemap-0.xml')).toMatch(new RegExp(`^${STYLESHEET_HREF_PATTERN.source}${URLSET}$`))
  })

  it("is expected to write the stylesheet to the linked path, declaring the site's origin ahead of it", async () => {
    await writeFile(join(outputDir, 'sitemap-0.xml'), URLSET)

    await build({ site: 'https://example.com/some/path/' })

    const href = (await output('sitemap-0.xml')).match(STYLESHEET_HREF_PATTERN)[1]
    const css = await output(href)
    expect(css).toMatch(/^:root \{\n {2}--sitemap-site: "https:\/\/example\.com";\n\}\n\n/)
    expect(css).toContain('urlset,\nsitemapindex {')
  })

  it('is expected to leave the origin undeclared when the site has none', async () => {
    await writeFile(join(outputDir, 'sitemap-0.xml'), URLSET)

    await build({ site: undefined })

    const href = (await output('sitemap-0.xml')).match(STYLESHEET_HREF_PATTERN)[1]
    expect(await output(href)).not.toContain('--sitemap-site:')
  })

  it('is expected to give a different site a different stylesheet URL', async () => {
    await writeFile(join(outputDir, 'sitemap-0.xml'), URLSET)
    await build({ site: 'https://example.com/' })
    const first = (await readdir(join(outputDir, '_astro')))[0]

    await rm(join(outputDir, '_astro'), { recursive: true })
    await writeFile(join(outputDir, 'sitemap-0.xml'), URLSET)
    await build({ site: 'https://example.org/' })
    const second = (await readdir(join(outputDir, '_astro')))[0]

    expect(second).not.toBe(first)
  })

  it("is expected to place the stylesheet under the site's base and assets directory", async () => {
    await writeFile(join(outputDir, 'sitemap-0.xml'), URLSET)

    await build({ base: '/docs', assets: 'static' })

    const href = (await output('sitemap-0.xml')).match(STYLESHEET_HREF_PATTERN)[1]
    expect(href).toMatch(/^\/docs\/static\/sitemap\.[0-9a-f]{8}\.css$/)
    expect(await readdir(join(outputDir, 'static'))).toEqual([href.split('/').pop()])
  })

  it('is expected to style only the files named after the configured filename base', async () => {
    await writeFile(join(outputDir, 'pages-0.xml'), URLSET)
    await writeFile(join(outputDir, 'feed.xml'), URLSET)

    await build({ options: { filenameBase: 'pages' } })

    expect(await output('pages-0.xml')).toMatch(STYLESHEET_HREF_PATTERN)
    expect(await output('feed.xml')).toBe(URLSET)
  })

  it('is expected to warn and write nothing when there are no sitemap files', async () => {
    await writeFile(join(outputDir, 'index.html'), '<!doctype html>')

    await build()

    expect(messages.warn).toHaveLength(1)
    expect(await readdir(outputDir)).toEqual(['index.html'])
  })
})
