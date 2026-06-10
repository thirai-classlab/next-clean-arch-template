/**
 * SupabaseAuthAdapter unit tests — task-37 Step 5 FIX-B
 *
 * Uses vi.mock to stub `@/lib/supabase/server` createClient and
 * `next/headers` headers(). This validates the adapter's contract
 * (error mapping, role narrowing, password non-leakage) without a
 * live Supabase connection (real smoke is user-manual, see draft Step 6/D5).
 *
 * NOTE: @injectable import requires reflect-metadata polyfill.
 */
import 'reflect-metadata'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SupabaseAuthAdapter } from './supabase-auth.adapter'
import { AuthorizationError, ExternalServiceError } from '@/lib/domain/errors'

// ---------------------------------------------------------------------------
// Supabase client mock factory
// ---------------------------------------------------------------------------

type MockAuthClient = {
  signInWithPassword: ReturnType<typeof vi.fn>
  getUser: ReturnType<typeof vi.fn>
  signInWithOAuth: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

type MockSupabaseClient = {
  auth: MockAuthClient
  from: ReturnType<typeof vi.fn>
}

let mockAuth: MockAuthClient
let mockSupabase: MockSupabaseClient

// Shared mock for the `from().select().eq().single()` chain.
// Each test can override the resolved value.
let mockFromResult: { data: unknown; error: unknown }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// next/headers mock — headers() returns a Headers-like object.
let mockHeaders: Map<string, string>

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

// Import after mocks are established.
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

beforeEach(() => {
  vi.clearAllMocks()

  mockFromResult = { data: { role: 'member' }, error: null }

  mockAuth = {
    signInWithPassword: vi.fn(),
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  }

  const fromChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(mockFromResult)),
  }

  mockSupabase = {
    auth: mockAuth,
    from: vi.fn().mockReturnValue(fromChain),
  }

  vi.mocked(createClient).mockResolvedValue(mockSupabase as never)

  mockHeaders = new Map([
    ['host', 'localhost:3000'],
    ['x-forwarded-proto', 'http'],
  ])
  vi.mocked(headers).mockResolvedValue({
    get: (key: string) => mockHeaders.get(key) ?? null,
  } as never)
})

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeAdapter() {
  return new SupabaseAuthAdapter()
}

// ---------------------------------------------------------------------------
// signInWithPassword
// ---------------------------------------------------------------------------
describe('SupabaseAuthAdapter.signInWithPassword', () => {
  it('returns ok with userId and role on successful sign-in', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockFromResult = { data: { role: 'admin' }, error: null }

    const adapter = makeAdapter()
    const result = await adapter.signInWithPassword('user@example.com', 'secret')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.userId).toBe('user-1')
      expect(result.value.role).toBe('admin')
    }
  })

  it('returns AuthorizationError when SDK returns an error (invalid credentials)', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithPassword('bad@example.com', 'wrongpass')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AuthorizationError)
    }
  })

  it('returns AuthorizationError when data.user is null', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithPassword('user@example.com', 'pass')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AuthorizationError)
    }
  })

  it('returns AuthorizationError when public.users role row is absent', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    })
    // Simulate no matching row in users table.
    mockFromResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } }

    const adapter = makeAdapter()
    const result = await adapter.signInWithPassword('user@example.com', 'pass')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AuthorizationError)
    }
  })

  it('returns ExternalServiceError when createClient throws', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('env not set'))

    const adapter = makeAdapter()
    const result = await adapter.signInWithPassword('user@example.com', 'pass')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
    }
  })

  it('does NOT include the password in any AuthorizationError message', async () => {
    const sensitivePassword = 'super-secret-password-123'
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithPassword('u@e.com', sensitivePassword)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const serialized = JSON.stringify(result.error)
      expect(serialized).not.toContain(sensitivePassword)
      expect(result.error.message).not.toContain(sensitivePassword)
    }
  })
})

// ---------------------------------------------------------------------------
// signInWithGoogle
// ---------------------------------------------------------------------------
describe('SupabaseAuthAdapter.signInWithGoogle', () => {
  it('returns ok with redirectUrl when OAuth init succeeds', async () => {
    const expectedUrl = 'https://accounts.google.com/o/oauth2/auth?...'
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: expectedUrl, provider: 'google' },
      error: null,
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithGoogle()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.redirectUrl).toBe(expectedUrl)
    }
  })

  it('returns ExternalServiceError when SDK returns an error', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth provider disabled' },
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithGoogle()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
    }
  })

  it('returns ExternalServiceError when data.url is missing (no url returned)', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithGoogle()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
    }
  })

  it('returns ExternalServiceError when headers() has no host', async () => {
    // Arrange: no host header available
    vi.mocked(headers).mockResolvedValue({
      get: (_key: string) => null,
    } as never)

    const adapter = makeAdapter()
    const result = await adapter.signInWithGoogle()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
    }
  })

  it('does NOT include sensitive data in ExternalServiceError for OAuth failure', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'oauth_error' },
    })

    const adapter = makeAdapter()
    const result = await adapter.signInWithGoogle()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      // No user credentials are involved in OAuth; error message must be stable/generic.
      const serialized = JSON.stringify(result.error)
      expect(serialized).not.toContain('password')
    }
  })
})

// ---------------------------------------------------------------------------
// toRole narrowing (via signInWithPassword role resolution path)
// ---------------------------------------------------------------------------
describe('toRole narrowing (via signInWithPassword role resolution)', () => {
  beforeEach(() => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-99' } },
      error: null,
    })
  })

  it('resolves "admin" role when users table returns role="admin"', async () => {
    mockFromResult = { data: { role: 'admin' }, error: null }

    const result = await makeAdapter().signInWithPassword('u@e.com', 'pass')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.role).toBe('admin')
  })

  it('resolves "viewer" role when users table returns role="viewer"', async () => {
    mockFromResult = { data: { role: 'viewer' }, error: null }

    const result = await makeAdapter().signInWithPassword('u@e.com', 'pass')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.role).toBe('viewer')
  })

  it('returns AuthorizationError for an out-of-union role string ("superadmin")', async () => {
    // "superadmin" is not in ROLES → toRole returns null → AuthorizationError.
    mockFromResult = { data: { role: 'superadmin' }, error: null }

    const result = await makeAdapter().signInWithPassword('u@e.com', 'pass')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })

  it('returns AuthorizationError when role is null in the users table', async () => {
    mockFromResult = { data: { role: null }, error: null }

    const result = await makeAdapter().signInWithPassword('u@e.com', 'pass')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })
})
