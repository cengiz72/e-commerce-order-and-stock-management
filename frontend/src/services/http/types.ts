/**
 * Public types of the shared HTTP client.
 *
 * See docs/frontend-architecture.md A3 / §3.6: the client is the only place that attaches
 * the JWT, resolves per-service base URLs, and normalizes error shapes.
 */

/**
 * Backend services the browser is allowed to call over HTTP.
 *
 * notification-service is deliberately absent: it is a Kafka consumer with no HTTP surface
 * (docs/frontend-architecture.md, Facts). Do not add it.
 */
export type ServiceName = 'product' | 'order' | 'payment' | 'user'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface RequestOptions {
  method?: HttpMethod
  /** Appended as a query string; `null`/`undefined` values are omitted. */
  query?: QueryParams
  /** Serialized as a JSON request body. Omit for bodyless requests. */
  body?: unknown
  /** Extra headers. These win over the client's defaults, including `Authorization`. */
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * The single normalized failure shape every caller receives, regardless of whether the
 * request failed with a 4xx, a 5xx, or a transport-level error.
 */
export interface ApiError {
  /** HTTP status code, or `0` when the request never produced a response. */
  status: number
  /**
   * Stable machine-readable code. One of {@link ApiErrorCodeValue} when the client produced
   * the error itself; an arbitrary backend-provided string otherwise — hence the `string &
   * {}` widening, which keeps `ApiErrorCodeValue`'s autocomplete without rejecting other
   * strings (a plain `string` type would erase that autocomplete entirely).
   */
  code: ApiErrorCodeValue | (string & {})
  /** Human-readable message, safe to log; not guaranteed to be user-facing copy. */
  message: string
}

/**
 * Result of every client call. The client never throws and never returns a raw `Response`,
 * so callers branch on `ok` only.
 */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; error: ApiError }

/** Error codes produced by the client itself (i.e. not sourced from a backend body). */
export const ApiErrorCode = {
  /** Request never reached a response (DNS/offline/CORS/connection reset). */
  Network: 'NETWORK_ERROR',
  /** Request was aborted via its `AbortSignal`. */
  Aborted: 'REQUEST_ABORTED',
  /** Request body could not be serialized to JSON. */
  InvalidRequest: 'INVALID_REQUEST',
  /** A 2xx response body could not be parsed. */
  InvalidResponse: 'INVALID_RESPONSE',
} as const

export type ApiErrorCodeValue = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]
