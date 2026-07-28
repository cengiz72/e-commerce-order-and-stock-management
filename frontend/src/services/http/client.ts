import { getAuthToken } from './authToken'
import { buildUrl } from './config'
import { ApiErrorCode } from './types'
import type { ApiError, ApiResult, RequestOptions, ServiceName } from './types'

/**
 * The single HTTP entry point of the frontend.
 *
 * Only `services/` modules may import this (CLAUDE.md: "API calls live under `services/`,
 * never inside components"). It holds no UI and no business logic — it resolves the
 * per-service base URL, attaches the JWT, and normalizes every failure into `ApiError`.
 */

const JSON_MEDIA_TYPE = 'application/json'
const MAX_TEXT_MESSAGE_LENGTH = 200

/**
 * `kind` records how the body was actually read, separately from `parsed`, so the success
 * path can reject a non-JSON 2xx body (see {@link request}) instead of returning raw text
 * as if it were `T` — while the error path can still use that same text as a message.
 */
type ParsedBody =
  | { parsed: true; kind: 'empty'; value: undefined }
  | { parsed: true; kind: 'json'; value: unknown }
  | { parsed: true; kind: 'text'; value: string }
  | { parsed: false; reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function truncate(value: string): string {
  return value.length > MAX_TEXT_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_TEXT_MESSAGE_LENGTH)}…`
    : value
}

/**
 * Build the request's headers, letting caller-supplied headers win over the defaults —
 * matched case-insensitively, since HTTP header names are case-insensitive and a naive merge
 * (`{ ...defaults, ...custom }`) would leave both `Authorization` and a caller's lowercase
 * `authorization` in the object, which `fetch` then sends as one comma-joined, invalid value.
 */
function buildHeaders(hasBody: boolean, custom?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: JSON_MEDIA_TYPE }
  if (hasBody) headers['Content-Type'] = JSON_MEDIA_TYPE
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (!custom) return headers

  const canonicalKeyByLowerCase = new Map(Object.keys(headers).map((key) => [key.toLowerCase(), key]))
  for (const [key, value] of Object.entries(custom)) {
    const existingKey = canonicalKeyByLowerCase.get(key.toLowerCase())
    if (existingKey !== undefined && existingKey !== key) delete headers[existingKey]
    headers[key] = value
    canonicalKeyByLowerCase.set(key.toLowerCase(), key)
  }
  return headers
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'AbortError'
}

function describeCause(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message
  return typeof cause === 'string' && cause ? cause : 'Unknown error'
}

/** A request that never produced a response: offline, DNS/CORS failure, or an abort. */
function toTransportError(cause: unknown): ApiError {
  return isAbortError(cause)
    ? { status: 0, code: ApiErrorCode.Aborted, message: 'Request was aborted' }
    : { status: 0, code: ApiErrorCode.Network, message: describeCause(cause) }
}

/** Read a response body without throwing. Empty and 204/205 bodies resolve to `undefined`. */
async function readBody(response: Response): Promise<ParsedBody> {
  if (response.status === 204 || response.status === 205) {
    return { parsed: true, kind: 'empty', value: undefined }
  }
  let text: string
  try {
    text = await response.text()
  } catch (cause) {
    return { parsed: false, reason: describeCause(cause) }
  }
  if (!text) return { parsed: true, kind: 'empty', value: undefined }
  if (!(response.headers.get('content-type') ?? '').includes('json')) {
    return { parsed: true, kind: 'text', value: text }
  }
  try {
    return { parsed: true, kind: 'json', value: JSON.parse(text) as unknown }
  } catch (cause) {
    return { parsed: false, reason: describeCause(cause) }
  }
}

/**
 * Normalize a non-2xx response. Backend-provided `code`/`message` fields are preferred;
 * otherwise the status is used so the shape is identical either way. Unlike the success path
 * (see {@link request}), a non-JSON body is fine here — its text becomes the `message`.
 */
function toHttpError(response: Response, body: ParsedBody): ApiError {
  const payload = body.parsed && body.kind === 'json' && isRecord(body.value) ? body.value : undefined
  const code =
    asNonEmptyString(payload?.code) ??
    asNonEmptyString(payload?.error) ??
    `HTTP_${response.status}`
  const textBody = body.parsed && body.kind === 'text' ? asNonEmptyString(body.value) : undefined
  const message =
    asNonEmptyString(payload?.message) ??
    (textBody ? truncate(textBody) : undefined) ??
    asNonEmptyString(response.statusText) ??
    `Request failed with status ${response.status}`
  return { status: response.status, code, message }
}

/**
 * Send a request to a backend service.
 *
 * Resolves to `{ ok: true, data }` on success and `{ ok: false, error }` on any failure —
 * 4xx, 5xx and transport errors all surface the same `ApiError` shape. It never throws and
 * never leaks a `Response` to the caller.
 */
export async function request<T>(
  service: ServiceName,
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', query, body, headers, signal } = options
  const hasBody = body !== undefined

  // `fetch` itself throws a TypeError on a GET with a body; catching it here keeps that
  // mistake inside the normalized error shape instead of surfacing as a confusing
  // NETWORK_ERROR. `http.get` already can't express this at the type level (see CallOptions);
  // this only matters for callers using `request`/`http.request` directly.
  if (hasBody && method === 'GET') {
    return {
      ok: false,
      error: { status: 0, code: ApiErrorCode.InvalidRequest, message: 'GET requests must not include a body' },
    }
  }

  let serializedBody: string | undefined
  if (hasBody) {
    try {
      serializedBody = JSON.stringify(body)
    } catch (cause) {
      return {
        ok: false,
        error: {
          status: 0,
          code: ApiErrorCode.InvalidRequest,
          message: `Request body could not be serialized: ${describeCause(cause)}`,
        },
      }
    }
  }

  const init: RequestInit = { method, headers: buildHeaders(hasBody, headers) }
  if (serializedBody !== undefined) init.body = serializedBody
  if (signal) init.signal = signal

  let response: Response
  try {
    response = await fetch(buildUrl(service, path, query), init)
  } catch (cause) {
    return { ok: false, error: toTransportError(cause) }
  }

  const parsedBody = await readBody(response)

  if (!response.ok) {
    return { ok: false, error: toHttpError(response, parsedBody) }
  }
  if (!parsedBody.parsed) {
    return {
      ok: false,
      error: {
        status: response.status,
        code: ApiErrorCode.InvalidResponse,
        message: `Response body could not be parsed: ${parsedBody.reason}`,
      },
    }
  }
  // A 2xx with a non-JSON body (an HTML error page from a proxy/auth redirect, most
  // realistically) is not success data — returning it as `T` would be a silent type lie that
  // fails later, at an unrelated property access, in whichever Phase 2 module called this.
  if (parsedBody.kind === 'text') {
    return {
      ok: false,
      error: {
        status: response.status,
        code: ApiErrorCode.InvalidResponse,
        message: `Expected a JSON response but received "${response.headers.get('content-type') ?? 'unknown content-type'}"`,
      },
    }
  }
  return { ok: true, status: response.status, data: parsedBody.value as T }
}

/** Options accepted by the method-shaped helpers; `method`/`body` are supplied by the helper. */
type CallOptions = Omit<RequestOptions, 'method' | 'body'>

/** Method-shaped sugar over {@link request}; identical semantics and return shape. */
export const http = {
  request,
  get: <T>(service: ServiceName, path: string, options?: CallOptions) =>
    request<T>(service, path, { ...options, method: 'GET' }),
  post: <T>(service: ServiceName, path: string, body?: unknown, options?: CallOptions) =>
    request<T>(service, path, { ...options, method: 'POST', body }),
  put: <T>(service: ServiceName, path: string, body?: unknown, options?: CallOptions) =>
    request<T>(service, path, { ...options, method: 'PUT', body }),
  patch: <T>(service: ServiceName, path: string, body?: unknown, options?: CallOptions) =>
    request<T>(service, path, { ...options, method: 'PATCH', body }),
  delete: <T>(service: ServiceName, path: string, options?: CallOptions) =>
    request<T>(service, path, { ...options, method: 'DELETE' }),
} as const
