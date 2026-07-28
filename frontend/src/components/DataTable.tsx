import type { ReactNode } from 'react'
import { cx } from './classNames'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'

/**
 * Tabular list rendering (docs/frontend-architecture.md §3.5) — order lines, admin catalog rows,
 * cart contents.
 *
 * Presentational only. It renders the rows it is handed, in the order it is handed them, and
 * owns **no** sorting, filtering, paging or selection logic: what to fetch and in what order is
 * a feature/server concern, and pagination state belongs to a feature hook. What it does own is
 * the three states every list has — loading, empty, and populated — so features stop
 * re-inventing them.
 *
 * `cell` is a render function rather than a field name so the caller formats with the right
 * component (`<Money>`, `<StatusBadge>`) instead of this table growing per-type knowledge.
 */
export interface DataTableColumn<Row> {
  /** Stable identity for the column; also the React key of its cells. */
  key: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  /** Text alignment; `'end'` suits money and quantity columns. */
  align?: 'start' | 'end'
}

export interface DataTableProps<Row> {
  columns: ReadonlyArray<DataTableColumn<Row>>
  rows: readonly Row[]
  /** Stable row identity — typically a backend id, which is an opaque string. */
  rowKey: (row: Row, index: number) => string
  /** Accessible description of the table. */
  caption?: ReactNode
  /** Renders placeholder rows instead of content. */
  loading?: boolean
  /** How many placeholder rows to show while `loading`. */
  skeletonRows?: number
  /** Shown when there are no rows and nothing is loading. Defaults to a generic `<EmptyState>`. */
  empty?: ReactNode
  className?: string
}

function alignClass<Row>(column: DataTableColumn<Row>): string {
  return `ui-table__cell--${column.align ?? 'start'}`
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  skeletonRows = 3,
  empty,
  className,
}: DataTableProps<Row>) {
  const showEmpty = !loading && rows.length === 0

  return (
    <table className={cx('ui-table', className)}>
      {caption == null ? null : <caption className="ui-table__caption">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={alignClass(column)}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody aria-busy={loading || undefined}>
        {loading
          ? Array.from({ length: Math.max(1, skeletonRows) }, (_unused, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    <Skeleton />
                  </td>
                ))}
              </tr>
            ))
          : rows.map((row, index) => (
              <tr key={rowKey(row, index)}>
                {columns.map((column) => (
                  <td key={column.key} className={alignClass(column)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
        {showEmpty ? (
          <tr>
            <td colSpan={Math.max(1, columns.length)} className="ui-table__empty">
              {empty ?? <EmptyState title="Nothing to show" />}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}
