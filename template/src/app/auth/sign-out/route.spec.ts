// apps/web/src/app/auth/sign-out/route.spec.ts
// Security fix (CRITICAL+HIGH): logout must not leave the MOCK_MODE session SSoT
// `mock_session` cookie alive (middleware reads it to authorize /dashboard /admin/*),
// and the redirect response must not be cached (bfcache / back-button restore).
//
// Verified behavior of POST /auth/sign-out:
//   (a) calls supabase.auth.signOut() (real session teardown)
//   (b) expires the `mock_session` cookie (empty value + maxAge 0, httpOnly+strict)
//   (c) sets Cache-Control: no-store on the redirect response (anti-bfcache)
//   (d) 303 redirect to /auth/sign-in
//
// MEDIUM-1 regression (#8 re-review): the Supabase teardown is env-guarded, so the
// (a)-(d) real-mode tests set NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in beforeEach; the
// pure-MOCK_MODE tests unset them (or force createClient to throw) and assert the
// route still clears mock_session + 303-redirects instead of 500-ing.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Supabase server client mock — signOut() resolves to undefined error by default.
const { mockSignOut, mockCreateClient } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

// next/headers cookies() mock — captures cookieStore.set() calls so we can assert
// the mock_session expiry without a real request scope.
const { mockCookieSet, mockCookies } = vi.hoisted(() => ({
  mockCookieSet: vi.fn(),
  mockCookies: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}))

describe('POST /auth/sign-out (Route Handler)', () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    mockSignOut.mockReset()
    mockCreateClient.mockReset()
    mockCookieSet.mockReset()
    mockCookies.mockReset()

    mockCreateClient.mockResolvedValue({
      auth: { signOut: mockSignOut },
    })
    mockSignOut.mockResolvedValue({ error: null })
    mockCookies.mockResolvedValue({ set: mockCookieSet })

    // Default to "real mode" (Supabase configured) so the env-guarded teardown
    // runs. Individual MOCK_MODE tests override by deleting these.
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'stub-anon-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey
  })

  it('(a) calls supabase.auth.signOut()', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    await POST(req)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('(b) expires the mock_session cookie (empty value, maxAge 0, httpOnly, strict)', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    await POST(req)

    const call = mockCookieSet.mock.calls.find((c) => c[0] === 'mock_session')
    expect(call, 'mock_session cookie must be cleared on sign-out').toBeDefined()
    // cookieStore.set('mock_session', '', { maxAge: 0, ... })
    expect(call?.[1]).toBe('')
    const opts = call?.[2] ?? {}
    expect(opts.maxAge).toBe(0)
    expect(opts.path).toBe('/')
    expect(opts.httpOnly).toBe(true)
    expect(opts.sameSite).toBe('strict')
  })

  it('(c) sets Cache-Control: no-store on the redirect response (anti-bfcache)', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    const res = await POST(req)
    expect(res.headers.get('cache-control') ?? '').toContain('no-store')
  })

  it('(d) 303 redirects to /auth/sign-in', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location') ?? '').toMatch(/\/auth\/sign-in$/)
  })

  it('(b2) still clears mock_session even when supabase signOut errors (graceful)', async () => {
    mockSignOut.mockResolvedValueOnce({ error: { message: 'network' } })
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest
    const res = await POST(req)
    const call = mockCookieSet.mock.calls.find((c) => c[0] === 'mock_session')
    expect(call).toBeDefined()
    expect(res.status).toBe(303)
  })

  // ── MEDIUM-1 regression (#8 security re-review, conf 0.87) ───────────────
  // 純 MOCK_MODE では Supabase env (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) が未設定で、
  // `createClient()` 内の `createServerClient(url!, key!, …)` が空/undefined url で
  // **同期 throw** する (@supabase/ssr)。route.ts が catch しないと sign-out は 500 で
  // 落ち、mock_session 失効 (route.ts) に到達せず cookie が残存 (= 認可残存)。
  // middleware.ts:51-53 の env early-exit と整合する形で teardown を guard する。
  it('(MEDIUM-1) pure MOCK_MODE (Supabase env absent): skips Supabase teardown, still 303 + clears mock_session (no 500)', async () => {
    // 純 MOCK_MODE: createServerClient が同期 throw する条件を env unset で再現。
    // route の env-guard が createClient を呼ばずに teardown を skip し、後続の
    // mock_session 失効 + redirect に必ず到達することを検証する。
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    // createClient が万一呼ばれたら @supabase/ssr 相当の同期 throw を起こす。
    mockCreateClient.mockImplementation(() => {
      throw new Error(
        '@supabase/ssr: Your project URL and API key are required to create a Supabase client!',
      )
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest

    // (a) must NOT 500 — sign-out must complete with the 303 redirect.
    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location') ?? '').toMatch(/\/auth\/sign-in$/)

    // env-guard が効いているので createClient (= Supabase teardown) は呼ばれない。
    expect(mockCreateClient).not.toHaveBeenCalled()

    // (b) mock_session must still be expired (maxAge 0) so authorization cannot
    //     survive logout in pure MOCK_MODE.
    const call = mockCookieSet.mock.calls.find((c) => c[0] === 'mock_session')
    expect(
      call,
      'mock_session must be cleared even when Supabase teardown is skipped',
    ).toBeDefined()
    expect(call?.[1]).toBe('')
    expect(call?.[2]?.maxAge).toBe(0)

    // (c) anti-bfcache header still applied.
    expect(res.headers.get('cache-control') ?? '').toContain('no-store')
  })

  it('(MEDIUM-1) env present but createClient throws: caught, still 303 + clears mock_session (no 500)', async () => {
    // env はあるが Supabase が到達不可で createServerClient が throw するケース。
    // route の try-catch が握り潰し、mock_session 失効 + redirect に到達する。
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error('supabase unreachable')
    })
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest

    const res = await POST(req)
    expect(res.status).toBe(303)
    const call = mockCookieSet.mock.calls.find((c) => c[0] === 'mock_session')
    expect(call).toBeDefined()
    expect(call?.[2]?.maxAge).toBe(0)
  })

  it('(MEDIUM-1) env present but async signOut rejects: caught, still 303 + clears mock_session', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network down'))
    const { POST } = await import('./route')
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    }) as unknown as import('next/server').NextRequest

    const res = await POST(req)
    expect(res.status).toBe(303)
    const call = mockCookieSet.mock.calls.find((c) => c[0] === 'mock_session')
    expect(call).toBeDefined()
    expect(call?.[2]?.maxAge).toBe(0)
  })
})
