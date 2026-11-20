import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const run = promisify(execFile)
const PACKAGE_DIRECTORY = fileURLToPath(new URL('..', import.meta.url))

describe('package entry', () => {
  it('is expected to declare every runtime export in index.d.ts', async () => {
    const runtimeExports = Object.keys(await import('../src/index.mjs')).sort()
    const declarations = await readFile(new URL('../src/index.d.ts', import.meta.url), 'utf-8')
    const declaredExports = [...declarations.matchAll(/^export declare (?:function|const|class) (\w+)/gm)].map(
      (match) => match[1]
    )

    expect([...new Set(declaredExports)].sort()).toEqual(runtimeExports)
  })
})

describe('package manifest', () => {
  it('is expected to ship the source, the stylesheet, the README and the licence only', async () => {
    const { stdout } = await run('npm', ['pack', '--dry-run', '--json'], { cwd: PACKAGE_DIRECTORY })
    const report = JSON.parse(stdout)

    // npm 11 reports an array of packed packages, npm 12 an object keyed by package name.
    const [packed] = Array.isArray(report) ? report : Object.values(report)
    const paths = packed.files.map((file) => file.path)

    expect(paths.every((path) => /^src\/|^(LICENSE|README\.md|package\.json)$/.test(path))).toBe(true)
    expect(paths).toContain('src/sitemap-stylesheet.css')
    expect(paths).toContain('src/index.d.ts')
  })
})
