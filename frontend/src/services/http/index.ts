/**
 * Public surface of the shared HTTP client (docs/frontend-architecture.md A3, §3.6).
 *
 * Importable by `services/` modules only — never by `components/`, `features/` or `hooks/`.
 */
export { http, request } from './client'
export { setAuthTokenProvider } from './authToken'
export type { AuthTokenProvider } from './authToken'
export { ApiErrorCode } from './types'
export type {
  ApiError,
  ApiErrorCodeValue,
  ApiResult,
  HttpMethod,
  QueryParams,
  RequestOptions,
  ServiceName,
} from './types'
