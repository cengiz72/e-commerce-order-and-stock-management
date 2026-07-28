import { describe, expect, it } from 'vitest'
import * as components from './index'

/**
 * Smoke test of the public design-system surface, the way a feature will import it:
 * `import { Button, Money } from '../../components'`.
 *
 * It also proves the barrel's `import './components.css'` side effect resolves — nothing else in
 * the repo imports that stylesheet yet, so a broken path would otherwise stay invisible until
 * the first feature ticket.
 */

const EXPECTED_EXPORTS = [
  'Button',
  'DataTable',
  'EmptyState',
  'ErrorBoundary',
  'ErrorFallback',
  'Input',
  'Modal',
  'Money',
  'Select',
  'Skeleton',
  'Spinner',
  'StatusBadge',
  'Toast',
  // Formatting helpers that belong with the components that use them.
  'DEFAULT_CURRENCY',
  'formatMoney',
  'isMoneyAmount',
  'humanizeStatus',
] as const

describe('components barrel', () => {
  it.each(EXPECTED_EXPORTS)('exports %s', (name) => {
    expect(components).toHaveProperty(name)
  })

  it('exports nothing beyond its documented surface', () => {
    // Internals (`cx`, `Field`, the id helpers) stay unexported so they can change freely.
    expect(Object.keys(components).sort()).toEqual([...EXPECTED_EXPORTS].sort())
  })
})
