// src/lib/interfaces/actions/sign-in-bridge.action.spec.ts
// auth-login-strategy §Step 3 — Server Action bridge unit tests:
//  - cookie set → redirect ordering (H-R2-3)
//  - mock_session cookie attributes (H-R2-3 / SEC-MED-01)
//  - password never logged / stack-traced / JSON-serialised (H-4)
//  - redirect target from ?next= via referer + isSafeNext (M-R2-11)
//  - rate-limit wiring for the password action (task #36 reuse)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- mocks --------------------------------------------------------------
const mockHeadersGet = vi.fn()
const mockCookieSet = vi.fn()
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: (k: string) => mockHeadersGet(k) }),
  cookies: vi.fn().mockResolvedValue({ set: (...a: unknown[]) => mockCookieSet(...a) }),
}))

// redirect() throws NEXT_REDIRECT in Next.js; emulate that so we can assert the
// thrown target AND that cookies().set ran before the throw.
const REDIRECT = 'NEXT_REDIRECT'
const mockRedirect = vi.fn((to: string) => {
  const e = new Error(`${REDIRECT}:${to}`)
  throw e
})
vi.mock('next/navigation', () => ({
  redirect: (to: string) => mockRedirect(to),
}))

const mockGoogleExecute = vi.fn()
const mockPasswordExecute = vi.fn()
vi.mock('@/app/api/_shared/use-case-factories', () => ({
  signInWithGoogleFactory: vi.fn().mockResolvedValue({ execute: () => mockGoogleExecute() }),
  signInWithPasswordFactory: vi
    .fn()
    .mockResolvedValue({ execute: (i: unknown) => mockPasswordExecute(i) }),
}))

const mockApplyRateLimit = vi.fn()
const mockClearRateLimit = vi.fn()
vi.mock('./_shared/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./_shared/rate-limit')>()
  return {
    ...actual,
    applyRateLimit: (...a: unknown[]) => mockApplyRateLimit(...a),
    clearRateLimit: (...a: unknown[]) => mockClearRateLimit(...a),
  }
})

vi.mock('@/lib/security/client-ip', () => ({ getClientIp: () => '203.0.113.9' }))

import {
  signInWithGoogleAction,
  signInWithPasswordAction,
} from './sign-in.action'
import { ok, err } from '@/lib/application/result'
import { AuthorizationError, ExternalServiceError } from '@/lib/domain/errors'

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

describe('Step 3 Server Action bridge (MOCK_MODE)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MOCK_MODE = 'true'
    // NODE_ENV is a read-only typed property; stub it so secure=false (localhost).
    vi.stubEnv('NODE_ENV', 'test')
    mockHeadersGet.mockReturnValue(null)
    mockApplyRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 0 })
    mockClearRateLimit.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete process.env.MOCK_MODE
    vi.unstubAllEnvs()
  })

  describe('signInWithGoogleAction', () => {
    it('sets mock_session cookie BEFORE redirecting (ordering H-R2-3)', async () => {
      mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: 'https://unused' }))
      const order: string[] = []
      mockCookieSet.mockImplementation(() => order.push('cookie'))
      mockRedirect.mockImplementation((to: string) => {
        order.push('redirect')
        throw new Error(`${REDIRECT}:${to}`)
      })

      await expect(signInWithGoogleAction()).rejects.toThrow(REDIRECT)
      expect(order).toEqual(['cookie', 'redirect'])
    })

    it('writes mock_session=<role> with HttpOnly/Strict/maxAge attributes', async () => {
      mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: 'https://unused' }))
      await expect(signInWithGoogleAction()).rejects.toThrow(REDIRECT)
      const [name, value, opts] = mockCookieSet.mock.calls[0]
      expect(name).toBe('mock_session')
      expect(value).toBe('admin')
      expect(opts).toMatchObject({
        httpOnly: true,
        sameSite: 'strict',
        secure: false, // NODE_ENV !== production → localhost http compatible
        maxAge: 3600,
      })
    })

    it('redirects to / by default (M-R2-2)', async () => {
      mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: 'https://unused' }))
      await expect(signInWithGoogleAction()).rejects.toThrow(`${REDIRECT}:/`)
    })

    it('honours a safe ?next= from the referer (M-R2-11)', async () => {
      mockHeadersGet.mockImplementation((k: string) =>
        k === 'referer' ? 'http://localhost:3000/auth/sign-in?next=/admin' : null,
      )
      mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: 'https://unused' }))
      await expect(signInWithGoogleAction()).rejects.toThrow(`${REDIRECT}:/admin`)
    })

    it('rejects an unsafe ?next= and falls back to / (M-R2-11)', async () => {
      mockHeadersGet.mockImplementation((k: string) =>
        k === 'referer'
          ? 'http://localhost:3000/auth/sign-in?next=//evil.com'
          : null,
      )
      mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: 'https://unused' }))
      await expect(signInWithGoogleAction()).rejects.toThrow(`${REDIRECT}:/`)
    })
  })

  describe('signInWithPasswordAction', () => {
    it('sets mock_session cookie BEFORE redirecting on success', async () => {
      mockPasswordExecute.mockResolvedValue(ok({ userId: 'mock-user-admin', role: 'admin' }))
      const order: string[] = []
      mockCookieSet.mockImplementation(() => order.push('cookie'))
      mockRedirect.mockImplementation((to: string) => {
        order.push('redirect')
        throw new Error(`${REDIRECT}:${to}`)
      })

      const fd = makeFormData({ email: 'test@classlab.co.jp', password: 'password123' })
      await expect(signInWithPasswordAction(null, fd)).rejects.toThrow(REDIRECT)
      expect(order).toEqual(['cookie', 'redirect'])
      expect(mockClearRateLimit).toHaveBeenCalledWith('203.0.113.9', 'signin:password')
    })

    it('applies the rate-limit gate before verification and short-circuits when blocked', async () => {
      mockApplyRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 42 })
      const fd = makeFormData({ email: 'a@b.co', password: 'x' })

      const state = await signInWithPasswordAction(null, fd)

      expect(state.error).toContain('42')
      expect(mockPasswordExecute).not.toHaveBeenCalled()
      expect(mockCookieSet).not.toHaveBeenCalled()
      expect(mockClearRateLimit).not.toHaveBeenCalled()
    })

    it('returns a generic error and does NOT leak the password on a bad credential (H-4)', async () => {
      mockPasswordExecute.mockResolvedValue(err(new AuthorizationError('invalid credentials')))
      const secret = 'super-secret-pw-9000'
      const fd = makeFormData({ email: 'test@classlab.co.jp', password: secret })

      const state = await signInWithPasswordAction(null, fd)

      // returned state must not contain the password (not serialised, H-4)
      expect(JSON.stringify(state)).not.toContain(secret)
      expect(state.error).toBeTruthy()
      // failed credential must not clear the counter (brute-force window intact)
      expect(mockClearRateLimit).not.toHaveBeenCalled()
      expect(mockCookieSet).not.toHaveBeenCalled()
    })

    it('does not write the password into the cookie value on success (H-4)', async () => {
      mockPasswordExecute.mockResolvedValue(ok({ userId: 'mock-user-member', role: 'member' }))
      const secret = 'another-secret-pw'
      const fd = makeFormData({ email: 'test@classlab.co.jp', password: secret })

      await expect(signInWithPasswordAction(null, fd)).rejects.toThrow(REDIRECT)
      const [, value] = mockCookieSet.mock.calls[0]
      expect(value).toBe('member')
      expect(value).not.toContain(secret)
    })
  })
})

// ---------------------------------------------------------------------------
// FIX-A: additional tests (task-37 Step 5 reviewer gaps)
// ---------------------------------------------------------------------------

describe('Step 3 Server Action bridge — FIX-A additions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    mockHeadersGet.mockReturnValue(null)
    mockApplyRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 0 })
    mockClearRateLimit.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // FIX-A-1a: real mode — signInWithPasswordAction does NOT set cookie, only redirects
  describe('real mode (MOCK_MODE=false)', () => {
    beforeEach(() => {
      vi.stubEnv('MOCK_MODE', 'false')
    })

    it('signInWithPasswordAction: real mode skips cookie.set and redirects on success', async () => {
      mockPasswordExecute.mockResolvedValue(ok({ userId: 'real-user-member', role: 'member' }))
      const fd = makeFormData({ email: 'real@example.com', password: 'realpassword123' })

      await expect(signInWithPasswordAction(null, fd)).rejects.toThrow(REDIRECT)
      // real mode: Supabase session is already established by adapter; no mock cookie
      expect(mockCookieSet).not.toHaveBeenCalled()
      // clearRateLimit is called on success regardless of mode
      expect(mockClearRateLimit).toHaveBeenCalled()
    })

    // FIX-A-1b: real mode — signInWithGoogleAction does NOT set cookie, redirects to provider URL
    it('signInWithGoogleAction: real mode redirects to provider OAuth URL without setting cookie', async () => {
      const oauthUrl = 'https://accounts.google.com/o/oauth2/auth?...'
      mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: oauthUrl }))

      await expect(signInWithGoogleAction()).rejects.toThrow(`${REDIRECT}:${oauthUrl}`)
      // real mode: hand off to provider; no mock_session cookie should be set
      expect(mockCookieSet).not.toHaveBeenCalled()
    })
  })

  // FIX-A-2: cookie value is the role string, not the password (password leak detection)
  it('signInWithPasswordAction: cookie value is the role (not the password string) — password leak guard', async () => {
    process.env.MOCK_MODE = 'true'
    // Use a password that is clearly distinguishable from any valid role value
    const password = 'distinguishable-password-XYZ-99'
    mockPasswordExecute.mockResolvedValue(ok({ userId: 'mock-user-viewer', role: 'viewer' }))
    const fd = makeFormData({ email: 'test@classlab.co.jp', password })

    await expect(signInWithPasswordAction(null, fd)).rejects.toThrow(REDIRECT)
    const [, cookieValue] = mockCookieSet.mock.calls[0]
    // The cookie value must be a role, not the password
    expect(cookieValue).toMatch(/^(admin|member|viewer)$/)
    expect(cookieValue).not.toBe(password)
  })

  // FIX-A-3: cookie path='/' is included in the options
  it('signInWithPasswordAction: cookie options include path="/" (SEC-MED-01)', async () => {
    process.env.MOCK_MODE = 'true'
    mockPasswordExecute.mockResolvedValue(ok({ userId: 'mock-user-admin', role: 'admin' }))
    const fd = makeFormData({ email: 'test@classlab.co.jp', password: 'somepassword' })

    await expect(signInWithPasswordAction(null, fd)).rejects.toThrow(REDIRECT)
    const [, , opts] = mockCookieSet.mock.calls[0]
    expect(opts).toMatchObject({ path: '/' })
  })

  // FIX-A-4: empty credentials yield AuthorizationError, no password in state, no cookie set
  it('signInWithPasswordAction: empty email/password → AuthorizationError, no password in JSON, no cookie set', async () => {
    process.env.MOCK_MODE = 'true'
    mockPasswordExecute.mockResolvedValue(err(new AuthorizationError('invalid credentials')))
    const fd = makeFormData({ email: '', password: '' })

    const state = await signInWithPasswordAction(null, fd)

    expect(state.error).toBeTruthy()
    // Empty string should not appear as a meaningful credential leak, but also verify
    // that the state JSON does not include the literal password field value in a
    // way that would leak a non-empty password (regression guard, H-4)
    expect(JSON.stringify(state)).not.toContain('"password"')
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  // FIX-A-5: signInWithGoogleAction → ExternalServiceError → redirect to error page
  it('signInWithGoogleAction: ExternalServiceError → redirect("/auth/sign-in?error=oauth")', async () => {
    process.env.MOCK_MODE = 'true'
    mockGoogleExecute.mockResolvedValue(err(new ExternalServiceError('google-oauth', new Error('provider down'))))

    await expect(signInWithGoogleAction()).rejects.toThrow(`${REDIRECT}:/auth/sign-in?error=oauth`)
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  // FIX-A-6: signInWithGoogleAction does NOT call applyRateLimit (design decision H-9)
  // The Google OAuth action intentionally skips rate-limiting because the OAuth
  // redirect itself provides protection; only the password action is rate-limited.
  it('signInWithGoogleAction: does NOT call applyRateLimit (design decision — OAuth redirect is not a brute-force vector, H-9)', async () => {
    process.env.MOCK_MODE = 'true'
    mockGoogleExecute.mockResolvedValue(ok({ redirectUrl: 'https://unused' }))

    await expect(signInWithGoogleAction()).rejects.toThrow(REDIRECT)
    expect(mockApplyRateLimit).not.toHaveBeenCalled()
  })

  // FIX-A-7: clearRateLimit is called with the exact endpoint 'signin:password' on success
  it('signInWithPasswordAction: clearRateLimit is called with second arg "signin:password" (RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD) on success', async () => {
    process.env.MOCK_MODE = 'true'
    mockPasswordExecute.mockResolvedValue(ok({ userId: 'mock-user-admin', role: 'admin' }))
    const fd = makeFormData({ email: 'test@classlab.co.jp', password: 'correct-password' })

    await expect(signInWithPasswordAction(null, fd)).rejects.toThrow(REDIRECT)
    expect(mockClearRateLimit).toHaveBeenCalledWith('203.0.113.9', 'signin:password')
  })
})
