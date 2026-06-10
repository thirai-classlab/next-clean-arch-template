// src/lib/interfaces/actions/sign-in-vps-nest.action.spec.ts
// Unit tests for the vps-nest-* profile Server Actions.
//
// Tests cover:
//   signInWithPasswordNestAction:
//     - rate-limit gate (blocked)
//     - empty credentials validation
//     - MOCK_MODE path (sets mock_session cookie + redirects)
//     - missing NEST_API_URL (error)
//     - Nest API 401 → error message
//     - Nest API non-200 non-401 → generic error
//     - network failure → connection error
//     - success: proxies Set-Cookie + redirects
//
//   signInWithGoogleNestAction:
//     - MOCK_MODE path (sets mock_session + redirects)
//     - missing NEST_API_URL → redirect error
//     - real mode: redirects to NEST_API_URL/auth/google

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── next/headers mock ──────────────────────────────────────────────────────
const { mockCookieSet, mockCookies, mockHeaders, mockGetHeader } = vi.hoisted(() => ({
  mockCookieSet: vi.fn(),
  mockCookies: vi.fn(),
  mockHeaders: vi.fn(),
  mockGetHeader: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mockCookies,
  headers: mockHeaders,
}))

// ── next/navigation mock ────────────────────────────────────────────────────
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// ── @/lib/env mock (isMockMode) ─────────────────────────────────────────────
const { mockIsMockMode } = vi.hoisted(() => ({
  mockIsMockMode: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  isMockMode: mockIsMockMode,
  getValidatedEnv: vi.fn(),
}))

// ── rate-limit mock ─────────────────────────────────────────────────────────
const { mockApplyRateLimit, mockClearRateLimit } = vi.hoisted(() => ({
  mockApplyRateLimit: vi.fn(),
  mockClearRateLimit: vi.fn(),
}))

vi.mock('@/lib/interfaces/actions/_shared/rate-limit', () => ({
  applyRateLimit: mockApplyRateLimit,
  clearRateLimit: mockClearRateLimit,
  RATE_LIMIT_ENDPOINT: { SIGNIN_PASSWORD: 'signin:password' },
}))

// ── @/lib/security/client-ip mock ──────────────────────────────────────────
vi.mock('@/lib/security/client-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// ── @/lib/security/safe-next mock ──────────────────────────────────────────
vi.mock('@/lib/security/safe-next', () => ({
  isSafeNext: (path: string) => path.startsWith('/'),
}))

// ── global fetch mock ──────────────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildFormData(email: string, password: string): FormData {
  const fd = new FormData()
  fd.append('email', email)
  fd.append('password', password)
  return fd
}

function makeRedirectError(): Error {
  const err = new Error('NEXT_REDIRECT')
  Object.assign(err, { digest: 'NEXT_REDIRECT;replace;/;307;' })
  return err
}

// ─────────────────────────────────────────────────────────────────────────────
// signInWithPasswordNestAction
// ─────────────────────────────────────────────────────────────────────────────

describe('signInWithPasswordNestAction', () => {
  const prevNestApiUrl = process.env.NEST_API_URL

  beforeEach(() => {
    vi.resetModules()
    mockCookies.mockResolvedValue({ set: mockCookieSet })
    mockHeaders.mockResolvedValue({ get: mockGetHeader })
    mockGetHeader.mockReturnValue(null)
    mockApplyRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 0 })
    mockClearRateLimit.mockResolvedValue(undefined)
    mockIsMockMode.mockReturnValue(false)
    mockRedirect.mockImplementation(() => { throw makeRedirectError() })
    process.env.NEST_API_URL = 'http://localhost:3001'
  })

  afterEach(() => {
    if (prevNestApiUrl === undefined) delete process.env.NEST_API_URL
    else process.env.NEST_API_URL = prevNestApiUrl
    vi.clearAllMocks()
  })

  it('returns rate-limit error when gate blocks the request', async () => {
    // Arrange
    mockApplyRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSec: 60 })
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    const result = await signInWithPasswordNestAction(null, buildFormData('a@b.com', 'pass'))

    // Assert
    expect(result.error).toMatch(/Too many attempts/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns validation error when email or password is empty', async () => {
    // Arrange
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    const result = await signInWithPasswordNestAction(null, buildFormData('', ''))

    // Assert
    expect(result.error).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('MOCK_MODE: sets mock_session cookie and redirects without calling Nest', async () => {
    // Arrange
    mockIsMockMode.mockReturnValue(true)
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    await expect(
      signInWithPasswordNestAction(null, buildFormData('test@x.com', 'pass')),
    ).rejects.toThrow('NEXT_REDIRECT')

    // Assert
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockCookieSet).toHaveBeenCalledWith(
      'mock_session',
      'member',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('returns error when NEST_API_URL is not set', async () => {
    // Arrange
    delete process.env.NEST_API_URL
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    const result = await signInWithPasswordNestAction(null, buildFormData('a@b.com', 'pass'))

    // Assert
    expect(result.error).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns "invalid credentials" error when Nest API returns 401', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response('{"message":"Unauthorized"}', { status: 401 }),
    )
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    const result = await signInWithPasswordNestAction(null, buildFormData('a@b.com', 'wrong'))

    // Assert
    expect(result.error).toMatch(/メールアドレスまたはパスワードが正しくありません/)
  })

  it('returns generic error when Nest API returns a non-401 error', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    )
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    const result = await signInWithPasswordNestAction(null, buildFormData('a@b.com', 'pass'))

    // Assert
    expect(result.error).toBeTruthy()
  })

  it('returns connection error when fetch throws (network failure)', async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    const result = await signInWithPasswordNestAction(null, buildFormData('a@b.com', 'pass'))

    // Assert
    expect(result.error).toMatch(/サーバーへの接続/)
  })

  it('proxies nest-session-token from Set-Cookie header and redirects on success', async () => {
    // Arrange
    const jwtValue = 'eyJhbGciOiJIUzI1NiJ9.stub.stub'
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'a@b.com', role: 'member' }), {
        status: 200,
        headers: {
          'set-cookie': `nest-session-token=${jwtValue}; Path=/; HttpOnly; SameSite=Lax`,
        },
      }),
    )
    const { signInWithPasswordNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    await expect(
      signInWithPasswordNestAction(null, buildFormData('a@b.com', 'correct')),
    ).rejects.toThrow('NEXT_REDIRECT')

    // Assert: nest-session-token proxied to the browser cookie.
    expect(mockCookieSet).toHaveBeenCalledWith(
      'nest-session-token',
      jwtValue,
      expect.objectContaining({ httpOnly: true }),
    )
    expect(mockClearRateLimit).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// signInWithGoogleNestAction
// ─────────────────────────────────────────────────────────────────────────────

describe('signInWithGoogleNestAction', () => {
  const prevNestApiUrl = process.env.NEST_API_URL

  beforeEach(() => {
    vi.resetModules()
    mockCookies.mockResolvedValue({ set: mockCookieSet })
    mockHeaders.mockResolvedValue({ get: mockGetHeader })
    mockGetHeader.mockReturnValue(null)
    mockIsMockMode.mockReturnValue(false)
    mockRedirect.mockImplementation(() => { throw makeRedirectError() })
    process.env.NEST_API_URL = 'http://localhost:3001'
  })

  afterEach(() => {
    if (prevNestApiUrl === undefined) delete process.env.NEST_API_URL
    else process.env.NEST_API_URL = prevNestApiUrl
    vi.clearAllMocks()
  })

  it('MOCK_MODE: sets mock_session=admin and redirects without calling Nest', async () => {
    // Arrange
    mockIsMockMode.mockReturnValue(true)
    const { signInWithGoogleNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    await expect(signInWithGoogleNestAction()).rejects.toThrow('NEXT_REDIRECT')

    // Assert
    expect(mockCookieSet).toHaveBeenCalledWith(
      'mock_session',
      'admin',
      expect.objectContaining({ httpOnly: true }),
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('redirects to NEST_API_URL/auth/google (real mode)', async () => {
    // Arrange
    const { signInWithGoogleNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    await expect(signInWithGoogleNestAction()).rejects.toThrow('NEXT_REDIRECT')

    // Assert: redirect() called with the Nest Google OAuth URL.
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost:3001/auth/google')
  })

  it('redirects to /auth/sign-in?error=oauth when NEST_API_URL is not set', async () => {
    // Arrange
    delete process.env.NEST_API_URL
    const { signInWithGoogleNestAction } = await import('./sign-in-vps-nest.action')

    // Act
    await expect(signInWithGoogleNestAction()).rejects.toThrow('NEXT_REDIRECT')

    // Assert: error redirect
    expect(mockRedirect).toHaveBeenCalledWith('/auth/sign-in?error=oauth')
  })
})
