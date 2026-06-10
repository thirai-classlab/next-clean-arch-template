// src/auth.spec.ts
// Unit tests for the isEmailAllowed domain enforcement function (pure, no DB).
//
// Tests cover:
//   - domain absent/empty → allow all
//   - exact @domain.com suffix match → allow
//   - subdomain NOT allowed (must be exact @domain.com suffix)
//   - cross-domain → reject
//   - null/undefined email → reject when domain set
//
// We mock next-auth and @auth/prisma-adapter because they import next/server
// and @prisma/client which are not available in the vitest jsdom environment.

import { describe, it, expect, vi } from 'vitest'

// Mock next-auth and related modules before importing the module under test.
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}))

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google', type: 'oauth' })),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({ id: 'credentials', type: 'credentials' })),
}))

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({})),
}))

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}))

vi.mock('@/lib/infrastructure/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

// Now import the function under test. isEmailAllowed is a pure function
// with no side effects and no runtime dependencies.
import { isEmailAllowed } from './auth'

describe('isEmailAllowed', () => {
  // ── Domain check OFF (env absent or empty) ────────────────────────────────

  it('allows any email when domainEnv is undefined', () => {
    expect(isEmailAllowed('user@anything.com', undefined)).toBe(true)
    expect(isEmailAllowed('evil@evil.com', undefined)).toBe(true)
  })

  it('allows any email when domainEnv is empty string', () => {
    expect(isEmailAllowed('user@anything.com', '')).toBe(true)
  })

  it('allows any email when domainEnv is whitespace only', () => {
    expect(isEmailAllowed('user@example.com', '   ')).toBe(true)
  })

  it('allows any email (including null email) when domain check is OFF', () => {
    expect(isEmailAllowed(null, undefined)).toBe(true)
    expect(isEmailAllowed(undefined, '')).toBe(true)
  })

  // ── Domain check ON ───────────────────────────────────────────────────────

  it('allows an exact domain match', () => {
    expect(isEmailAllowed('user@example.com', 'example.com')).toBe(true)
  })

  it('allows multiple users on the same domain', () => {
    expect(isEmailAllowed('admin@example.com', 'example.com')).toBe(true)
    expect(isEmailAllowed('member@example.com', 'example.com')).toBe(true)
  })

  it('rejects email from a different domain', () => {
    expect(isEmailAllowed('evil@other.com', 'example.com')).toBe(false)
  })

  it('rejects email with the domain as a substring but NOT as an @-prefix suffix', () => {
    // 'notexample.com' ends with 'example.com' but NOT '@example.com'
    expect(isEmailAllowed('user@notexample.com', 'example.com')).toBe(false)
  })

  it('rejects subdomain — sub.example.com is NOT @example.com', () => {
    // AUTH_ALLOWED_EMAIL_DOMAIN=example.com should not allow sub.example.com
    // The check is endsWith('@example.com') — 'user@sub.example.com' ends with
    // '.example.com', not '@example.com'
    expect(isEmailAllowed('user@sub.example.com', 'example.com')).toBe(false)
  })

  it('rejects a null email when domain check is ON', () => {
    expect(isEmailAllowed(null, 'example.com')).toBe(false)
  })

  it('rejects an undefined email when domain check is ON', () => {
    expect(isEmailAllowed(undefined, 'example.com')).toBe(false)
  })

  it('rejects an empty string email when domain check is ON', () => {
    expect(isEmailAllowed('', 'example.com')).toBe(false)
  })

  // ── Normalization (case / leading @) ─────────────────────────────────────

  it('is case-insensitive — uppercase domain in email is accepted (RFC 5321)', () => {
    // Email domains are case-insensitive per RFC 5321, and on the OAuth path
    // the provider controls casing. Both sides are lowercased before comparison.
    expect(isEmailAllowed('user@EXAMPLE.COM', 'example.com')).toBe(true)
    expect(isEmailAllowed('User@Example.Com', 'example.com')).toBe(true)
  })

  it('is case-insensitive — uppercase domainEnv matches lowercase email', () => {
    expect(isEmailAllowed('user@example.com', 'EXAMPLE.COM')).toBe(true)
    expect(isEmailAllowed('evil@other.com', 'EXAMPLE.COM')).toBe(false)
  })

  it('case-insensitivity does not weaken cross-domain rejection', () => {
    expect(isEmailAllowed('evil@OTHER.COM', 'example.com')).toBe(false)
    expect(isEmailAllowed('user@SUB.EXAMPLE.COM', 'example.com')).toBe(false)
  })

  it('accepts a domainEnv with a leading @ (normalized, matches ALLOWED_ADMIN_EMAIL_DOMAIN convention)', () => {
    // AUTH_ALLOWED_EMAIL_DOMAIN=@example.com must behave like =example.com —
    // without stripping, the check would become endsWith('@@example.com') and
    // silently reject ALL users (operator misconfiguration trap).
    expect(isEmailAllowed('user@example.com', '@example.com')).toBe(true)
    expect(isEmailAllowed('evil@other.com', '@example.com')).toBe(false)
  })

  it('trims whitespace from domainEnv before checking', () => {
    // domainEnv='  example.com  ' should be trimmed to 'example.com'
    expect(isEmailAllowed('user@example.com', '  example.com  ')).toBe(true)
    expect(isEmailAllowed('evil@other.com', '  example.com  ')).toBe(false)
  })
})
