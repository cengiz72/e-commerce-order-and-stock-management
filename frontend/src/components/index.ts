/**
 * `components/` — the shared presentational design system
 * (docs/frontend-architecture.md §3.5, A8; docs/phases/01-app-shell-and-core-infrastructure.md).
 *
 * ## The rule this layer exists to enforce
 *
 * Props in, UI out. Nothing here imports `services/`, performs HTTP, or holds business logic, so
 * any feature can use any of it without dragging in a data dependency (CLAUDE.md — "keep
 * business logic separate from UI/framework glue"). Local presentational state (a timer on a
 * toast, focus inside a modal) is fine; domain state is not. `layerBoundary.test.ts` asserts
 * that mechanically.
 *
 * Data-shaped state — what is loading, what came back, what failed — belongs to feature hooks;
 * this layer only accepts the *result* as props (`loading`, `error`, `rows`, `status`, `amount`).
 *
 * ## Notable calls made here
 *
 * - **`<Money>`** is the only place currency is rendered, and it formats a **decimal string**
 *   without float arithmetic (see `./moneyFormat`).
 * - **`<StatusBadge status>`** takes an open `string`, because order/payment statuses are
 *   backend-owned and not finalized (postgre-schema.md OQ2).
 * - **`ErrorBoundary`** is the one class component in `src/`, because React provides no hook
 *   equivalent — justified in `./ErrorBoundary`.
 *
 * Feature-specific components do **not** live here; they belong to their own `features/*` folder.
 */
import './components.css'

export { Button } from './Button'
export type { ButtonProps, ButtonVariant } from './Button'

export { DataTable } from './DataTable'
export type { DataTableColumn, DataTableProps } from './DataTable'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { ErrorBoundary, ErrorFallback } from './ErrorBoundary'
export type {
  ErrorBoundaryFallbackRenderProps,
  ErrorBoundaryProps,
  ErrorFallbackProps,
} from './ErrorBoundary'

export { Input } from './Input'
export type { InputProps } from './Input'

export { Modal } from './Modal'
export type { ModalProps } from './Modal'

export { Money } from './Money'
export type { MoneyProps } from './Money'
export { DEFAULT_CURRENCY, formatMoney, isMoneyAmount } from './moneyFormat'
export type { FormatMoneyOptions, MoneyAmount } from './moneyFormat'

export { Select } from './Select'
export type { SelectOption, SelectProps } from './Select'

export { Skeleton } from './Skeleton'
export type { SkeletonProps } from './Skeleton'

export { Spinner } from './Spinner'
export type { SpinnerProps } from './Spinner'

export { StatusBadge } from './StatusBadge'
export type { StatusBadgeProps, StatusTone } from './StatusBadge'
export { humanizeStatus } from './statusLabel'

export { Toast } from './Toast'
export type { ToastProps, ToastTone } from './Toast'
