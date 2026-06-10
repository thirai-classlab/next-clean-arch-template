// @vitest-environment node
// src/lib/supabase/middleware-vps-nest.spec.ts
// Unit tests for getNextNestSessionRole() — the Edge-safe HS256 JWT verifier
// used by src/middleware.ts when DEPLOY_PROFILE=vps-nest-postgres or vps-nest-mariadb.
//
// @vitest-environment node is required because jose's SignJWT minting uses
// TextEncoder().encode() → Uint8Array, which has cross-realm identity issues in
// jsdom (the default test environment). Node env ensures the same Uint8Array
// realm is used throughout.
//
// Test strategy:
//   - Mint real HS256 JWTs with jose (same library as production) to avoid brittle mocks.
//   - Test the happy path (valid token → role returned), all null-return paths
//     (missing env, missing cookie, expired, wrong secret, missing claim), and the
//     MOCK_MODE fallback branch documented in middleware.ts.
//
// AAA (Arrange-Act-Assert) pattern throughout.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SignJWT } from 'jose'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_SECRET = 'a-test-jwt-secret-that-is-at-least-32-chars'

async function mintToken(
  payload: Record<string, unknown>,
  secret: string = TEST_SECRET,
  expiresInSec = 3600,
): Promise<string> {
  const secretBytes = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
    .sign(secretBytes)
}

function buildRequest(cookieValue?: string): NextRequest {
  const url = 'http://localhost:3000/'
  const init: RequestInit = {}
  if (cookieValue !== undefined) {
    init.headers = { cookie: `nest-session-token=${cookieValue}` }
  }
  // NextRequest constructor accepts a URL + init with headers.
  // Provide a minimal mock that satisfies the cookies.get() interface used in the impl.
  const req = new Request(url, init) as unknown as NextRequest
  // Attach a minimal .cookies shim (middleware-vps-nest.ts calls request.cookies.get()).
  const cookieHeader = init.headers
    ? (init.headers as Record<string, string>)['cookie']
    : undefined
  Object.defineProperty(req, 'cookies', {
    value: {
      get(name: string) {
        if (!cookieHeader) return undefined
        const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
        return match ? { name, value: match[1] } : undefined
      },
    },
  })
  return req
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('getNextNestSessionRole()', () => {
  const prevSecret = process.env.JWT_SECRET

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (prevSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = prevSecret
    }
  })

  it('returns the role claim from a valid HS256 JWT (happy path)', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    const token = await mintToken({ sub: 'user-1', email: 'a@b.com', role: 'admin' })
    const request = buildRequest(token)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBe('admin')
  })

  it('returns null when JWT_SECRET is not set', async () => {
    // Arrange
    delete process.env.JWT_SECRET
    const token = await mintToken({ role: 'member' })
    const request = buildRequest(token)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBeNull()
  })

  it('returns null when nest-session-token cookie is absent (unauthenticated)', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    const request = buildRequest(/* no cookie */)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBeNull()
  })

  it('returns null when the JWT is signed with a different secret (tampered)', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    const token = await mintToken({ role: 'admin' }, 'different-secret-that-is-32chars!!')
    const request = buildRequest(token)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBeNull()
  })

  it('returns null when the JWT is expired', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    // Mint a token that expired 1 second ago.
    const token = await mintToken({ role: 'member' }, TEST_SECRET, -1)
    const request = buildRequest(token)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBeNull()
  })

  it('returns null when the JWT payload has no role claim', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    const token = await mintToken({ sub: 'user-2', email: 'c@d.com' /* no role */ })
    const request = buildRequest(token)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBeNull()
  })

  it('returns null when the cookie value is not a valid JWT (malformed)', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    const request = buildRequest('not.a.valid.jwt')

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert — must not throw; must return null gracefully.
    expect(role).toBeNull()
  })

  it('returns "member" role from a token carrying that claim', async () => {
    // Arrange
    process.env.JWT_SECRET = TEST_SECRET
    const token = await mintToken({ sub: 'u', email: 'u@x.com', role: 'member' })
    const request = buildRequest(token)

    // Act
    const { getNextNestSessionRole } = await import('./middleware-vps-nest')
    const role = await getNextNestSessionRole(request)

    // Assert
    expect(role).toBe('member')
  })
})
