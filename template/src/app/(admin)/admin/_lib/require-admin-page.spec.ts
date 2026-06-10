// src/app/(admin)/admin/_lib/require-admin-page.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { decideAdminGate, resolveMockAdminGate } from './require-admin-page'
import type { RoleCheckResult } from '@/lib/auth/role-guard'

describe('decideAdminGate', () => {
  it('renders (with adminId) for an allowed admin session', () => {
    const result: RoleCheckResult = {
      kind: 'allowed',
      userId: 'admin-1',
      role: 'admin',
    }
    expect(decideAdminGate(result)).toEqual({
      kind: 'render',
      outcome: { adminId: 'admin-1', envDeferred: false },
    })
  })

  it('redirects to /dashboard for a real non-admin session', () => {
    const result: RoleCheckResult = { kind: 'forbidden', role: 'member' }
    expect(decideAdminGate(result)).toEqual({
      kind: 'redirect',
      to: '/dashboard',
    })
  })

  it('renders in env-deferred mode when no session resolvable (env unset)', () => {
    const result: RoleCheckResult = { kind: 'unauthorized' }
    expect(decideAdminGate(result)).toEqual({
      kind: 'render',
      outcome: { adminId: null, envDeferred: true },
    })
  })
})

// ── resolveMockAdminGate ───────────────────────────────────────────────────────
// Tests for the MOCK_MODE cookie fallback that allows admin pages to render
// with real store data when Supabase env is unset (task-35 1d fix).
//
// next/headers cookies() is mocked so tests run outside a request context.

const mockCookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined,
  })),
}))

describe('resolveMockAdminGate — MOCK_MODE=true, NODE_ENV=test (dev-like)', () => {
  beforeEach(() => {
    mockCookieStore.clear()
    vi.stubEnv('MOCK_MODE', 'true')
    // NODE_ENV stays 'test' (set by vitest) which is !== 'production'
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns allowed result when mock_session=admin cookie is present', async () => {
    // Arrange
    mockCookieStore.set('mock_session', 'admin')

    // Act
    const result = await resolveMockAdminGate()

    // Assert
    expect(result).toEqual({ kind: 'allowed', userId: 'mock-user-admin', role: 'admin' })
  })

  it('returns undefined (pass-through) when mock_session cookie is absent', async () => {
    const result = await resolveMockAdminGate()
    expect(result).toBeUndefined()
  })

  it('returns undefined when mock_session is a non-admin role (member)', async () => {
    // Middleware already blocked non-admins; keep unauthorized so the
    // middleware-layer decision stands.
    mockCookieStore.set('mock_session', 'member')
    const result = await resolveMockAdminGate()
    expect(result).toBeUndefined()
  })

  it('returns undefined when mock_session is a non-admin role (viewer)', async () => {
    mockCookieStore.set('mock_session', 'viewer')
    const result = await resolveMockAdminGate()
    expect(result).toBeUndefined()
  })

  it('returns undefined for an unrecognised cookie value', async () => {
    mockCookieStore.set('mock_session', 'superuser')
    const result = await resolveMockAdminGate()
    expect(result).toBeUndefined()
  })
})

describe('resolveMockAdminGate — production guard (NODE_ENV=production)', () => {
  beforeEach(() => {
    mockCookieStore.clear()
    // vi.stubEnv safely overrides both MOCK_MODE and NODE_ENV for this test
    // group; vitest restores them automatically after each test via vi.unstubAllEnvs.
    vi.stubEnv('MOCK_MODE', 'true')
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns undefined even when mock_session=admin and MOCK_MODE=true in production', async () => {
    // Security: cookie bypass must NEVER activate in production.
    mockCookieStore.set('mock_session', 'admin')
    const result = await resolveMockAdminGate()
    expect(result).toBeUndefined()
  })
})

describe('resolveMockAdminGate — MOCK_MODE=false (production-like)', () => {
  beforeEach(() => {
    mockCookieStore.clear()
    vi.stubEnv('MOCK_MODE', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns undefined when MOCK_MODE is false, regardless of cookie', async () => {
    mockCookieStore.set('mock_session', 'admin')
    const result = await resolveMockAdminGate()
    expect(result).toBeUndefined()
  })
})
