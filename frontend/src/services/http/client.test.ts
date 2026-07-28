import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, request } from './client'
import { setAuthTokenProvider } from './authToken'
import { ApiErrorCode } from './types'
import type { ServiceName } from './types'

/**
 * The backend has no endpoints yet (only package-info.java files exist), so every case here
 * runs against a stubbed global `fetch` with mock payloads.
 */

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200, statusText?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  })
}

function textResponse(body: string, status = 200, statusText?: string): Response {
  return new Response(body, { status, statusText, headers: { 'content-type': 'text/plain' } })
}

function lastCall(): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch was never called')
  const [input, init] = call
  return { url: String(input), init: init ?? {} }
}

function lastHeaders(): Record<string, string> {
  return (lastCall().init.headers ?? {}) as Record<string, string>
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  setAuthTokenProvider(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  setAuthTokenProvider(null)
})

describe('base URL resolution (AC1)', () => {
  const defaults: Array<[ServiceName, string]> = [
    ['product', 'http://localhost:8081'],
    ['order', 'http://localhost:8082'],
    ['payment', 'http://localhost:8083'],
    ['user', 'http://localhost:8084'],
  ]

  it.each(defaults)('routes %s calls to its own base URL', async (service, baseUrl) => {
    await request(service, '/api/v1/ping')
    expect(lastCall().url).toBe(`${baseUrl}/api/v1/ping`)
  })

  it('prefers the configured Vite env base URL over the default', async () => {
    vi.stubEnv('VITE_ORDER_SERVICE_URL', 'https://orders.example.com')
    await request('order', '/api/v1/orders/42')
    expect(lastCall().url).toBe('https://orders.example.com/api/v1/orders/42')
  })

  it('normalizes a trailing slash on the base URL and a missing leading slash on the path', async () => {
    vi.stubEnv('VITE_PRODUCT_SERVICE_URL', 'https://products.example.com/')
    await request('product', 'api/v1/products')
    expect(lastCall().url).toBe('https://products.example.com/api/v1/products')
  })

  it('appends query params, skipping null/undefined and expanding arrays', async () => {
    await request('product', '/api/v1/products', {
      query: { q: 'red shoe', page: 0, inStock: true, categoryId: null, cursor: undefined, tag: ['a', 'b'] },
    })
    expect(lastCall().url).toBe(
      'http://localhost:8081/api/v1/products?q=red+shoe&page=0&inStock=true&tag=a&tag=b',
    )
  })

  it('omits the query string entirely when every value is empty', async () => {
    await request('product', '/api/v1/products', { query: { categoryId: undefined } })
    expect(lastCall().url).toBe('http://localhost:8081/api/v1/products')
  })

  it('merges a query object into a path that already has its own query string', async () => {
    await request('product', '/api/v1/products?featured=true', { query: { page: 2 } })
    const url = new URL(lastCall().url)
    expect(url.pathname).toBe('/api/v1/products')
    expect(url.searchParams.get('featured')).toBe('true')
    expect(url.searchParams.get('page')).toBe('2')
    expect(lastCall().url).not.toContain('??')
  })
})

describe('auth header attachment (AC2)', () => {
  it('sends no Authorization header when no token provider is registered', async () => {
    await request('user', '/api/v1/me')
    expect(lastHeaders().Authorization).toBeUndefined()
  })

  it('attaches the bearer token automatically once a provider is registered', async () => {
    setAuthTokenProvider(() => 'jwt-abc')
    await request('order', '/api/v1/orders')
    expect(lastHeaders().Authorization).toBe('Bearer jwt-abc')
  })

  it('re-reads the token on every request', async () => {
    let token = 'first'
    setAuthTokenProvider(() => token)
    await request('order', '/api/v1/orders')
    expect(lastHeaders().Authorization).toBe('Bearer first')
    token = 'second'
    await request('order', '/api/v1/orders')
    expect(lastHeaders().Authorization).toBe('Bearer second')
  })

  it('sends no Authorization header when the provider has no token', async () => {
    setAuthTokenProvider(() => null)
    await request('order', '/api/v1/orders')
    expect(lastHeaders().Authorization).toBeUndefined()
  })

  it('stops attaching the header after the provider is cleared', async () => {
    setAuthTokenProvider(() => 'jwt-abc')
    await request('order', '/api/v1/orders')
    setAuthTokenProvider(null)
    await request('order', '/api/v1/orders')
    expect(lastHeaders().Authorization).toBeUndefined()
  })

  it('lets a caller-supplied header override a default', async () => {
    setAuthTokenProvider(() => 'jwt-abc')
    await request('order', '/api/v1/orders', { headers: { Authorization: 'Bearer override' } })
    expect(lastHeaders().Authorization).toBe('Bearer override')
  })

  it('overrides default headers case-insensitively instead of duplicating them', async () => {
    setAuthTokenProvider(() => 'jwt-abc')
    await request('order', '/api/v1/orders', {
      method: 'POST',
      body: { foo: 'bar' },
      headers: { authorization: 'Bearer lowercase-override', 'content-type': 'application/xml' },
    })
    const headers = lastHeaders()
    expect(headers.authorization).toBe('Bearer lowercase-override')
    expect(headers.Authorization).toBeUndefined()
    expect(headers['content-type']).toBe('application/xml')
    expect(headers['Content-Type']).toBeUndefined()
  })
})

describe('successful responses', () => {
  it('returns the parsed body and status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p-1', name: 'Shoe' }, 200))
    const result = await request<{ id: string; name: string }>('product', '/api/v1/products/p-1')
    expect(result).toEqual({ ok: true, status: 200, data: { id: 'p-1', name: 'Shoe' } })
  })

  it('treats a 204 as success with no data', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const result = await request('order', '/api/v1/orders/42', { method: 'DELETE' })
    expect(result).toEqual({ ok: true, status: 204, data: undefined })
  })

  it('serializes a JSON body and sets Accept/Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ orderId: 'o-1' }, 201))
    const result = await http.post('order', '/api/v1/orders', { productId: 'p-1', quantity: 2 })
    const { init } = lastCall()
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"productId":"p-1","quantity":2}')
    expect(lastHeaders()['Content-Type']).toBe('application/json')
    expect(lastHeaders().Accept).toBe('application/json')
    expect(result).toEqual({ ok: true, status: 201, data: { orderId: 'o-1' } })
  })

  it('sends no body or Content-Type for bodyless methods', async () => {
    await http.get('product', '/api/v1/products')
    const { init } = lastCall()
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(lastHeaders()['Content-Type']).toBeUndefined()
  })

  it('normalizes an unparsable 2xx body instead of throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response('{not json', { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const result = await request('product', '/api/v1/products')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.error.status).toBe(200)
    expect(result.error.code).toBe(ApiErrorCode.InvalidResponse)
  })

  it('rejects a non-JSON 2xx body instead of returning it as data', async () => {
    fetchMock.mockResolvedValue(textResponse('<html>login</html>', 200))
    const result = await request('user', '/api/v1/me')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.error.status).toBe(200)
    expect(result.error.code).toBe(ApiErrorCode.InvalidResponse)
  })

  it('rejects a body on a GET request without calling fetch', async () => {
    const result = await request('product', '/api/v1/products', {
      method: 'GET',
      body: { oops: true },
    })
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.error.code).toBe(ApiErrorCode.InvalidRequest)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('normalized error shape (AC3)', () => {
  it('maps a 4xx with a backend code/message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: 'STOCK_UNAVAILABLE', message: 'Not enough stock' }, 409),
    )
    const result = await request('order', '/api/v1/orders', { method: 'POST', body: {} })
    expect(result).toEqual({
      ok: false,
      error: { status: 409, code: 'STOCK_UNAVAILABLE', message: 'Not enough stock' },
    })
  })

  it('falls back to the status and statusText when the body carries no code', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }))
    const result = await request('product', '/api/v1/products/missing')
    expect(result).toEqual({
      ok: false,
      error: { status: 404, code: 'HTTP_404', message: 'Not Found' },
    })
  })

  it("uses Spring's default error body field when present", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 500, error: 'Internal Server Error', path: '/api/v1/orders' }, 500),
    )
    const result = await request('order', '/api/v1/orders')
    expect(result).toEqual({
      ok: false,
      error: { status: 500, code: 'Internal Server Error', message: 'Request failed with status 500' },
    })
  })

  it('maps a plain-text 5xx body', async () => {
    fetchMock.mockResolvedValue(textResponse('upstream exploded', 502, 'Bad Gateway'))
    const result = await request('payment', '/api/v1/payments')
    expect(result).toEqual({
      ok: false,
      error: { status: 502, code: 'HTTP_502', message: 'upstream exploded' },
    })
  })

  it('maps a network-level rejection to status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await request('user', '/api/v1/login', { method: 'POST', body: {} })
    expect(result).toEqual({
      ok: false,
      error: { status: 0, code: ApiErrorCode.Network, message: 'Failed to fetch' },
    })
  })

  it('maps an aborted request distinctly, still at status 0', async () => {
    const abortError = new Error('The operation was aborted.')
    abortError.name = 'AbortError'
    fetchMock.mockRejectedValue(abortError)
    const result = await request('order', '/api/v1/orders', { signal: AbortSignal.abort() })
    expect(result).toEqual({
      ok: false,
      error: { status: 0, code: ApiErrorCode.Aborted, message: 'Request was aborted' },
    })
  })

  it('maps an unserializable request body without throwing', async () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const result = await http.post('order', '/api/v1/orders', circular)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')
    expect(result.error.status).toBe(0)
    expect(result.error.code).toBe(ApiErrorCode.InvalidRequest)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gives 4xx, 5xx and network failures the identical error shape', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, 400, 'Bad Request'))
    const clientError = await request('order', '/api/v1/orders')
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'boom' }, 503, 'Unavailable'))
    const serverError = await request('order', '/api/v1/orders')
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const networkError = await request('order', '/api/v1/orders')

    for (const result of [clientError, serverError, networkError]) {
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('expected failure')
      expect(Object.keys(result.error).sort()).toEqual(['code', 'message', 'status'])
      expect(typeof result.error.status).toBe('number')
      expect(typeof result.error.code).toBe('string')
      expect(typeof result.error.message).toBe('string')
    }
  })
})

describe('method helpers', () => {
  it.each([
    ['put', 'PUT'],
    ['patch', 'PATCH'],
  ] as const)('%s sends the right method and body', async (helper, method) => {
    await http[helper]('product', '/api/v1/products/p-1', { stock: 5 })
    expect(lastCall().init.method).toBe(method)
    expect(lastCall().init.body).toBe('{"stock":5}')
  })

  it('delete sends the right method and no body', async () => {
    await http.delete('product', '/api/v1/products/p-1')
    expect(lastCall().init.method).toBe('DELETE')
    expect(lastCall().init.body).toBeUndefined()
  })
})
