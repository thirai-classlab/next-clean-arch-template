// apps/web/src/app/auth/callback/route.spec.ts
// task-5 Step 7 round-3 fix (R3-A SEC-A7-2 CRITICAL / HIGH-N1):
//
// OAuth callback Route Handler の open redirect 防止検証。
// `?next=<path>` を無検証で `${origin}${next}` に concat していたため、
// `?next=//evil.com` のような scheme-relative URL で attacker site に redirect 可能だった。
//
// 検証 5 case:
//  (a) `?next=/dashboard`      → `/dashboard` redirect (whitelist 内 same-origin path、通過)
//  (b) `?next=//evil.com`      → `/` redirect           (scheme-relative reject)
//  (c) `?next=https://attacker.com` → `/` redirect       (absolute URL reject)
//  (d) `?next=\\evil.com`      → `/` redirect           (backslash trick reject — IE/旧 browser quirk)
//  (e) PKCE state mismatch     → `/auth/sign-in?error=session_exchange_failed` redirect
//
// Helper `isSafeNext` を unit test する形に純化 (Next.js server module mock 不要)。
// route.ts は同 helper を import して使用する。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isSafeNext } from '@/lib/security/safe-next'

describe('isSafeNext (OAuth callback redirect target validator)', () => {
  it('(a) accepts a same-origin absolute path "/dashboard"', () => {
    expect(isSafeNext('/dashboard')).toBe(true)
  })

  it('(b) rejects scheme-relative "//evil.com" (open redirect vector)', () => {
    expect(isSafeNext('//evil.com')).toBe(false)
    expect(isSafeNext('//evil.com/phish')).toBe(false)
  })

  it('(c) rejects absolute URL "https://attacker.com"', () => {
    expect(isSafeNext('https://attacker.com')).toBe(false)
    expect(isSafeNext('http://attacker.com')).toBe(false)
  })

  it('(d) rejects backslash-prefixed "\\\\evil.com" (legacy browser quirk)', () => {
    expect(isSafeNext('\\evil.com')).toBe(false)
    expect(isSafeNext('/\\evil.com')).toBe(false)
  })

  it('(e) rejects bare path without leading slash "dashboard"', () => {
    // Defense-in-depth: relative path can also be interpreted as scheme by some clients.
    expect(isSafeNext('dashboard')).toBe(false)
    expect(isSafeNext('')).toBe(false)
  })
})

// --- Route Handler GET integration (PKCE state mismatch → error redirect) ---

// Supabase server client mock — exchangeCodeForSession の成否を test ごとに差し替える。
// `vi.hoisted` で `vi.mock` の factory hoisting タイミング (spec body より先に evaluate) より
// 早く mock fn を生成する。これをしないと factory が capture する fn が undefined になる。
const { mockExchangeCodeForSession, mockCreateClient } = vi.hoisted(() => ({
  mockExchangeCodeForSession: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

// SEC-MED-04 (task-37 Step 7): route.ts uses pino logger instead of console.error.
// Mock the logger module so tests are not affected by log output and pino is not
// initialised in a test environment (pino uses a fd-write transport).
vi.mock('@/lib/infrastructure/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

describe('GET /auth/callback (Route Handler)', () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset()
    mockCreateClient.mockReset()
    // 毎 test で fresh な resolved object を返す。auth.exchangeCodeForSession への
    // mockResolvedValueOnce / mockResolvedValue chain は各 test 内で立てる。
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /auth/sign-in?error=session_exchange_failed on PKCE state mismatch', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'invalid PKCE state', name: 'AuthError' },
    })
    // logger is mocked at module level (SEC-MED-04); no console.error spy needed.
    const { GET } = await import('./route')
    const req = new Request('http://localhost:3000/auth/callback?code=abc') as unknown as import('next/server').NextRequest
    const res = await GET(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/auth/sign-in')
    expect(location).toContain('error=session_exchange_failed')
  })

  it('honors safe `next` query and redirects to /dashboard on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null })
    const { GET } = await import('./route')
    const req = new Request('http://localhost:3000/auth/callback?code=abc&next=/dashboard') as unknown as import('next/server').NextRequest
    const res = await GET(req)

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/dashboard$/)
    expect(location).not.toContain('evil.com')
  })

  it('strips unsafe `next` (scheme-relative) and falls back to "/" on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null })
    const { GET } = await import('./route')
    const req = new Request('http://localhost:3000/auth/callback?code=abc&next=//evil.com/phish') as unknown as import('next/server').NextRequest
    const res = await GET(req)

    const location = res.headers.get('location') ?? ''
    // Must NOT contain attacker host; must land on "/" (root of localhost origin)
    expect(location).not.toContain('evil.com')
    expect(location).toMatch(/^http:\/\/localhost:3000\/$/)
  })
})
