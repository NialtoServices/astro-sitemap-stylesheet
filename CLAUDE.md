# CLAUDE.md

A public npm package: an Astro integration that links the XML sitemaps `@astrojs/sitemap` writes to a CSS
stylesheet. Its README ships to npm as the package's documentation, including the setup each site needs.

## Hard rules

- **The stylesheet is the Nialto house sitemap design**, the same on every site, never a client's brand. Its
  footer credit stays.
- **Fixtures and examples use reserved domains** (`example.com`, `example.org`): the package is public, and the
  sites using it belong to clients.

## Releasing

- **The owner cuts releases.** Don't tag or publish unless asked.
- **Releases publish from CI, never from a workstation.** Bump `version` in `package.json`, commit it as
  `Release <version>`, tag that commit `v<version>` and push the tag. The `publish` job in `.github/workflows/ci.yml`
  stages it on npm once `verify` passes, and it is installable only after the owner approves it.

## Verify before finishing

```bash
pnpm format:check
pnpm test
```
