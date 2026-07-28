import { describe, expect, it } from 'vitest'
import { readLoginRedirect, toLoginRedirectState } from './loginRedirect'

describe('toLoginRedirectState', () => {
  it('captures the blocked path with its query string', () => {
    expect(toLoginRedirectState({ pathname: '/orders', search: '?page=2' })).toEqual({
      from: '/orders?page=2',
    })
  })

  it('captures a bare path when there is no query string', () => {
    expect(toLoginRedirectState({ pathname: '/cart', search: '' })).toEqual({ from: '/cart' })
  })
})

describe('readLoginRedirect', () => {
  it('reads back a destination it wrote', () => {
    const state = toLoginRedirectState({ pathname: '/checkout', search: '' })

    expect(readLoginRedirect(state)).toBe('/checkout')
  })

  it('has no destination when the visitor came to the login page directly', () => {
    expect(readLoginRedirect(null)).toBeNull()
    expect(readLoginRedirect(undefined)).toBeNull()
  })

  it('ignores state of the wrong shape instead of throwing', () => {
    expect(readLoginRedirect({})).toBeNull()
    expect(readLoginRedirect({ from: 42 })).toBeNull()
    expect(readLoginRedirect('/cart')).toBeNull()
  })

  it('refuses off-site destinations, so tampered history state cannot open-redirect', () => {
    expect(readLoginRedirect({ from: 'https://evil.example/steal' })).toBeNull()
    expect(readLoginRedirect({ from: '//evil.example/steal' })).toBeNull()
    expect(readLoginRedirect({ from: 'javascript:alert(1)' })).toBeNull()
    expect(readLoginRedirect({ from: 'orders' })).toBeNull()
  })
})
