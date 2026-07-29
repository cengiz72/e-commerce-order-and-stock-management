/**
 * Tiny class-name joiner, used only inside `components/`.
 *
 * Exists so every component can accept an optional `className` from its caller without each one
 * re-implementing the same `.filter(Boolean).join(' ')`. A dependency (`clsx`/`classnames`) would
 * be ~10 lines of behaviour for a new package, so it is not worth one (CLAUDE.md — no new
 * dependencies without justification).
 *
 * Not part of the public design-system surface: it is not re-exported from `components/index.ts`.
 */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
