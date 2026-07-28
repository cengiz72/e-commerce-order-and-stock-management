import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiErrorCode, http, request, setAuthTokenProvider } from './index'

/**
 * Smoke test of the public `services/` surface exactly as a Phase 2 service module will
 * consume it, against a stubbed endpoint (no live backend exists yet).
 */

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  setAuthTokenProvider(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthTokenProvider(null)
})

describe('services barrel', () => {
  it('re-exports the client entry points', () => {
    expect(typeof request).toBe('function')
    expect(typeof http.get).toBe('function')
    expect(typeof setAuthTokenProvider).toBe('function')
    expect(ApiErrorCode.Network).toBe('NETWORK_ERROR')
  })

  it('performs an authenticated round trip against a stubbed endpoint', async () => {
    setAuthTokenProvider(() => 'jwt-smoke')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 'p-1', name: 'Shoe', price: '19.99' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const result = await http.get<Array<{ id: string; name: string; price: string }>>(
      'product',
      '/api/v1/products',
      { query: { q: 'shoe' } },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8081/api/v1/products?q=shoe',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-smoke' }),
      }),
    )
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: [{ id: 'p-1', name: 'Shoe', price: '19.99' }],
    })
  })
})
