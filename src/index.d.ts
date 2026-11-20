import type { AstroIntegration } from 'astro'

export interface SitemapStylesheetOptions {
  /** The sitemap integration's `filenameBase`. Every `<filenameBase>-*.xml` file gets the stylesheet. */
  filenameBase?: string
}

/**
 * Links the sitemap files `@astrojs/sitemap` writes to a CSS stylesheet, so they read as a page in a browser. List it
 * after the sitemap integration.
 */
export declare function sitemapStylesheet(options?: SitemapStylesheetOptions): AstroIntegration
