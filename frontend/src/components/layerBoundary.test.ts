import { describe, expect, it } from 'vitest'

/**
 * AC1 — nothing in `components/` imports `services/` or performs HTTP.
 *
 * Asserted by reading the source rather than by review, because this is the rule the whole layer
 * exists to enforce (CLAUDE.md: "API calls live under `services/`, never inside components") and
 * a rule that is only written down is a rule that erodes. It is also the Phase 1 exit criterion
 * "`components/` modules have no imports from `services/` (verifiable by grep/lint rule)"
 * (docs/phases/01-app-shell-and-core-infrastructure.md).
 *
 * The check is deliberately stricter than "no `services/`": a design-system module may import
 * **only React and its own siblings**. That single rule rules out `services/`, `hooks/`,
 * `routes/` and `features/` in one go, and keeps this layer reusable by any feature without
 * dragging a data dependency along (docs/frontend-architecture.md A8).
 *
 * Sources are pulled in with Vite's `import.meta.glob(..., '?raw')` rather than `node:fs`: the
 * app tsconfig deliberately exposes only `vite/client` types, and this keeps the check running
 * through the same resolution the bundler uses.
 */

const rawModules = import.meta.glob('./*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Every non-test source file in `components/`, as `[name, contents]`. */
const sourceFiles: Array<[string, string]> = Object.entries(rawModules)
  .filter(([path]) => !path.includes('.test.'))
  .map(([path, source]) => [path.replace('./', ''), source])

/** Module specifiers of `import x from 'y'`, `import 'y'` and `export … from 'y'`. */
function moduleSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const pattern = /(?:\bfrom\s*|^\s*import\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/gm
  let match = pattern.exec(source)
  while (match !== null) {
    specifiers.push(match[1])
    match = pattern.exec(source)
  }
  return specifiers
}

/** A source-only pattern: `fetch(`, `axios`, and the browser transports next to them. */
const HTTP_PATTERN =
  /\bfetch\s*\(|XMLHttpRequest|\baxios\b|new\s+WebSocket|EventSource|navigator\.sendBeacon/

describe('components/ is a props-in/UI-out layer (AC1)', () => {
  it('finds the modules it is meant to police', () => {
    // Guards against the scan silently passing because it read nothing.
    const names = sourceFiles.map(([name]) => name)

    expect(names).toContain('index.ts')
    expect(names).toContain('Money.tsx')
    expect(names).toContain('ErrorBoundary.tsx')
    expect(names.length).toBeGreaterThan(10)
  })

  it.each(sourceFiles)('%s imports no service module', (_name, source) => {
    const offending = moduleSpecifiers(source).filter((specifier) => /services/.test(specifier))

    expect(offending).toEqual([])
  })

  it.each(sourceFiles)('%s imports only React and its own siblings', (_name, source) => {
    const offending = moduleSpecifiers(source).filter((specifier) => {
      if (specifier === 'react' || specifier.startsWith('react/')) return false
      // `./x` only — `../anything` would reach out of the design system.
      return !/^\.\/[^.]/.test(specifier)
    })

    expect(offending).toEqual([])
  })

  it.each(sourceFiles)('%s performs no HTTP of its own', (_name, source) => {
    expect(source).not.toMatch(HTTP_PATTERN)
  })
})
