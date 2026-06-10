// src/lib/interfaces/actions/_shared/auth-helper.spec.ts
// Unit tests for getAuthenticatedSession helper.
// Draft 06 §4.2 — verifies auth branches for both production (AuthPort) and
// MOCK_MODE (cookie fallback) paths.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const resolveMock = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  container: { resolve: (token: unknown) => resolveMock(token) },
  ensureContainer: vi.fn().mockResolvedValue(undefined),
}))

// Mock next/headers cookies() — returns a map-like interface
const mockCookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined,
  })),
}))

import { getAuthenticatedSession } from './auth-helper'
import { SEED_EMAIL } from '@/lib/infrastructure/adapters/mock/mock-auth.seed'

function authPortReturning(getSessionResult: unknown) {
  return { getSession: vi.fn().mockResolvedValue(getSessionResult) }
}

const originalMockMode = process.env.MOCK_MODE

describe('auth-helper (production path — MOCK_MODE=false)', () => {
  beforeEach(() => {
    resolveMock.mockReset()
    mockCookieStore.clear()
    process.env.MOCK_MODE = 'false'
  })

  afterEach(() => {
    process.env.MOCK_MODE = originalMockMode
  })

  it('returns null when getSession returns ok=false (error result)', async () => {
    // Arrange
    const authPort = authPortReturning({
      ok: false as const,
      error: new Error('service unavailable'),
    })
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    // Act
    const result = await getAuthenticatedSession()

    // Assert
    expect(result).toBeNull()
    expect(authPort.getSession).toHaveBeenCalledOnce()
  })

  it('returns null when getSession returns ok=true but value is null (no session)', async () => {
    // Arrange
    const authPort = authPortReturning({ ok: true as const, value: null })
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    // Act
    const result = await getAuthenticatedSession()

    // Assert
    expect(result).toBeNull()
    expect(authPort.getSession).toHaveBeenCalledOnce()
  })

  it('returns the session when getSession returns ok=true with a valid session', async () => {
    // Arrange
    const session = { userId: 'admin-1', role: 'admin' as const }
    const authPort = authPortReturning({ ok: true as const, value: session })
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    // Act
    const result = await getAuthenticatedSession()

    // Assert
    expect(result).toEqual({ userId: 'admin-1', role: 'admin' })
    expect(authPort.getSession).toHaveBeenCalledOnce()
  })
})

describe('auth-helper (MOCK_MODE=true — cookie fallback path)', () => {
  beforeEach(() => {
    resolveMock.mockReset()
    mockCookieStore.clear()
    process.env.MOCK_MODE = 'true'
    // Default: AuthPort returns null session (MockAuthAdapter.session starts null)
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPortReturning({ ok: true as const, value: null })
      throw new Error(`unexpected token: ${String(token)}`)
    })
  })

  afterEach(() => {
    process.env.MOCK_MODE = originalMockMode
  })

  it('returns null when mock_session cookie is absent', async () => {
    const result = await getAuthenticatedSession()
    expect(result).toBeNull()
  })

  it('returns null when mock_session cookie holds an unrecognised role', async () => {
    mockCookieStore.set('mock_session', 'superuser')
    const result = await getAuthenticatedSession()
    expect(result).toBeNull()
  })

  it('returns admin session (with seed email) when mock_session=admin', async () => {
    mockCookieStore.set('mock_session', 'admin')
    const result = await getAuthenticatedSession()
    // The MOCK cookie fallback now attaches the seed email so the shell avatar
    // menu can display a real address (default SEED_EMAIL = test@classlab.co.jp).
    expect(result).toEqual({
      userId: 'mock-user-admin',
      role: 'admin',
      email: SEED_EMAIL,
    })
  })

  it('returns member session (with seed email) when mock_session=member', async () => {
    mockCookieStore.set('mock_session', 'member')
    const result = await getAuthenticatedSession()
    expect(result).toEqual({
      userId: 'mock-user-member',
      role: 'member',
      email: SEED_EMAIL,
    })
  })

  it('AuthPort session takes priority over cookie when AuthPort has a valid session', async () => {
    // Arrange: AuthPort returns a real session
    const activePort = authPortReturning({
      ok: true as const,
      value: { userId: 'real-user-1', role: 'admin' as const },
    })
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return activePort
      throw new Error(`unexpected token: ${String(token)}`)
    })
    mockCookieStore.set('mock_session', 'member') // cookie would give member

    const result = await getAuthenticatedSession()

    // AuthPort session (admin) takes priority over cookie (member)
    expect(result).toEqual({ userId: 'real-user-1', role: 'admin' })
  })
})
