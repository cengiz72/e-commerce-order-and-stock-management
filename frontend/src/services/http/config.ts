import type { QueryParams, QueryValue, ServiceName } from './types'

/**
 * Placeholder localhost ports, one per callable backend service.
 *
 * No real ports exist yet (docker-compose.yml only runs infrastructure containers), so these
 * are conventional defaults: 8081 product, 8082 order, 8083 payment, 8084 user. Override per
 * environment with the matching `VITE_*_SERVICE_URL` variable (see frontend/.env.example).
 */
const DEFAULT_BASE_URLS: Record<ServiceName, string> = {
  product: 'http://localhost:8081',
  order: 'http://localhost:8082',
  payment: 'http://localhost:8083',
  user: 'http://localhost:8084',
}

/**
 * Read the configured base URL for a service.
 *
 * Vite replaces `import.meta.env.VITE_*` at build time, so these values are baked into the
 * bundle for a given build — setting the env var on the serving container at runtime has no
 * effect. This is still read per call (rather than once at module load) only so unit tests can
 * stub the env per test case; it does not make the value runtime-configurable in production.
 */
function envBaseUrl(service: ServiceName): string | undefined {
  switch (service) {
    case 'product':
      return import.meta.env.VITE_PRODUCT_SERVICE_URL
    case 'order':
      return import.meta.env.VITE_ORDER_SERVICE_URL
    case 'payment':
      return import.meta.env.VITE_PAYMENT_SERVICE_URL
    case 'user':
      return import.meta.env.VITE_USER_SERVICE_URL
  }
}

/** Base URL for a service, without a trailing slash. */
export function getServiceBaseUrl(service: ServiceName): string {
  const configured = envBaseUrl(service)?.trim()
  const baseUrl = configured ? configured : DEFAULT_BASE_URLS[service]
  return baseUrl.replace(/\/+$/, '')
}

function appendQueryValue(params: URLSearchParams, key: string, value: QueryValue): void {
  if (value === null || value === undefined) return
  params.append(key, String(value))
}

function appendQueryParams(params: URLSearchParams, query?: QueryParams): void {
  if (!query) return
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) appendQueryValue(params, key, item)
    } else {
      appendQueryValue(params, key, value)
    }
  }
}

/** Build a query string (including the leading `?`), or `''` when there is nothing to send. */
export function buildQueryString(query?: QueryParams): string {
  const params = new URLSearchParams()
  appendQueryParams(params, query)
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Resolve a service-relative path into an absolute request URL.
 *
 * Built with `URL`/`URLSearchParams` rather than string concatenation, so a `query` object
 * merges correctly by search param even when `path` already has its own `?query` — plain
 * concatenation would instead produce a second `?` (`/x?a=1?b=2`), which most HTTP servers
 * treat as one malformed key rather than two params.
 *
 * `path` is not segment-encoded here — it must already be a safe URL path. The opaque
 * `productId` string (docs/frontend-architecture.md, Facts) should be `encodeURIComponent`-ed
 * by the caller before being interpolated into `path`; prefer putting dynamic values in
 * `query` over `path` where the API allows it, since `query` is encoded automatically.
 */
export function buildUrl(service: ServiceName, path: string, query?: QueryParams): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(normalizedPath, `${getServiceBaseUrl(service)}/`)
  appendQueryParams(url.searchParams, query)
  return url.toString()
}
