// src/lib/interfaces/middleware/auth-guard.spec.ts
// Unit tests for decideMiddleware / buildSignInRedirect.
//
// Auth-guard policy (task: guard every route except `/auth/*`):
//   Rule 3: /auth/*                         → next (always public)
//   Rule 1: role null + non-/auth route     → redirect /auth/sign-in (preserveNext:true)
//   Rule 2: /admin/* + role !== 'admin'      → redirect /dashboard (no preserveNext)
//   Rule 4: authenticated + allowed          → next

import { describe, it, expect } from 'vitest'
import { buildSignInRedirect, decideMiddleware } from './auth-guard'

const SIGN_IN_PATH = '/auth/sign-in'

describe('decideMiddleware', () => {
  describe('Rule 1: unauthenticated (role = null) on a non-/auth route', () => {
    // Previously only /admin redirected to sign-in; now *every* non-/auth
    // surface is guarded. These cases all carry preserveNext:true so the
    // middleware can round-trip the original path as `?next=`.
    it('redirects bare / to sign-in with preserveNext', () => {
      const out = decideMiddleware({ pathname: '/', role: null })
      expect(out).toEqual({
        kind: 'redirect',
        to: SIGN_IN_PATH,
        preserveNext: true,
      })
    })

    it('redirects /bots to sign-in with preserveNext', () => {
      const out = decideMiddleware({ pathname: '/bots', role: null })
      expect(out).toEqual({
        kind: 'redirect',
        to: SIGN_IN_PATH,
        preserveNext: true,
      })
    })

    it('redirects /realtime to sign-in with preserveNext', () => {
      const out = decideMiddleware({ pathname: '/realtime', role: null })
      expect(out).toEqual({
        kind: 'redirect',
        to: SIGN_IN_PATH,
        preserveNext: true,
      })
    })

    it('redirects /dashboard to sign-in with preserveNext', () => {
      const out = decideMiddleware({ pathname: '/dashboard', role: null })
      expect(out).toEqual({
        kind: 'redirect',
        to: SIGN_IN_PATH,
        preserveNext: true,
      })
    })

    it('redirects /admin/users to sign-in with preserveNext', () => {
      const out = decideMiddleware({ pathname: '/admin/users', role: null })
      expect(out).toEqual({
        kind: 'redirect',
        to: SIGN_IN_PATH,
        preserveNext: true,
      })
    })
  })

  describe('Rule 3: /auth/* is always public (no infinite redirect loop)', () => {
    it('passes through /auth/sign-in for unauthenticated user', () => {
      const out = decideMiddleware({ pathname: '/auth/sign-in', role: null })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through /auth/sign-out for unauthenticated user', () => {
      const out = decideMiddleware({ pathname: '/auth/sign-out', role: null })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through /auth/callback for unauthenticated user', () => {
      const out = decideMiddleware({ pathname: '/auth/callback', role: null })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through /auth/pending-approval for unauthenticated user', () => {
      const out = decideMiddleware({
        pathname: '/auth/pending-approval',
        role: null,
      })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through /auth/* even for authenticated users', () => {
      const out = decideMiddleware({ pathname: '/auth/sign-in', role: 'admin' })
      expect(out).toEqual({ kind: 'next' })
    })
  })

  describe('Rule 2: /admin/* requires admin role', () => {
    it('passes through /admin/users for admin', () => {
      const out = decideMiddleware({ pathname: '/admin/users', role: 'admin' })
      expect(out).toEqual({ kind: 'next' })
    })

    it('redirects /admin/users to /dashboard for member (no preserveNext)', () => {
      const out = decideMiddleware({ pathname: '/admin/users', role: 'member' })
      expect(out).toEqual({ kind: 'redirect', to: '/dashboard' })
    })

    it('redirects /admin/users to /dashboard for viewer (no preserveNext)', () => {
      const out = decideMiddleware({ pathname: '/admin/users', role: 'viewer' })
      expect(out).toEqual({ kind: 'redirect', to: '/dashboard' })
    })
  })

  describe('Rule 4: authenticated user on an allowed route', () => {
    it('passes through /dashboard for admin', () => {
      const out = decideMiddleware({ pathname: '/dashboard', role: 'admin' })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through /dashboard for member', () => {
      const out = decideMiddleware({ pathname: '/dashboard', role: 'member' })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through general POC route / for authenticated member', () => {
      const out = decideMiddleware({ pathname: '/', role: 'member' })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through general POC route /bots for authenticated member', () => {
      const out = decideMiddleware({ pathname: '/bots', role: 'member' })
      expect(out).toEqual({ kind: 'next' })
    })

    it('passes through general POC route /realtime for authenticated viewer', () => {
      const out = decideMiddleware({ pathname: '/realtime', role: 'viewer' })
      expect(out).toEqual({ kind: 'next' })
    })
  })
})

/**
 * The dev admin bypass was removed permanently (task: remove-dev-admin-bypass).
 * The middleware now passes the resolved role (Supabase role ?? mock_session
 * cookie role) straight into decideMiddleware with no synthesis. These cases
 * lock in that an unauthenticated request to the dev gallery (and any /admin
 * surface) is guarded, while a real/mock admin role passes through.
 */
describe('admin gallery guard (post dev admin bypass removal)', () => {
  it('redirects unauthenticated /admin/dev/components to sign-in with preserveNext', () => {
    // No bypass: role=null reaches decideMiddleware → Rule 1 fires.
    const decision = decideMiddleware({
      pathname: '/admin/dev/components',
      role: null,
    })
    expect(decision).toEqual({
      kind: 'redirect',
      to: SIGN_IN_PATH,
      preserveNext: true,
    })
  })

  it('passes /admin/dev/components through for an admin role (real or mock_session=admin)', () => {
    const decision = decideMiddleware({
      pathname: '/admin/dev/components',
      role: 'admin',
    })
    expect(decision).toEqual({ kind: 'next' })
  })

  it('redirects a non-admin (member) away from /admin/dev/components to /dashboard', () => {
    const decision = decideMiddleware({
      pathname: '/admin/dev/components',
      role: 'member',
    })
    expect(decision).toEqual({ kind: 'redirect', to: '/dashboard' })
  })
})

describe('buildSignInRedirect', () => {
  describe('safe same-origin paths → ?next= appended (URL-encoded)', () => {
    it('appends a simple path', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, '/dashboard')).toBe(
        '/auth/sign-in?next=%2Fdashboard',
      )
    })

    it('appends bare / (Home)', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, '/')).toBe(
        '/auth/sign-in?next=%2F',
      )
    })

    it('URL-encodes nested paths so / becomes %2F', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, '/admin/users')).toBe(
        '/auth/sign-in?next=%2Fadmin%2Fusers',
      )
    })

    it('URL-encodes query/hash characters so they cannot break out of the param', () => {
      // The original path containing ? and = must be encoded so it stays a
      // single value of the `next` param.
      expect(buildSignInRedirect(SIGN_IN_PATH, '/bots?tab=live')).toBe(
        '/auth/sign-in?next=%2Fbots%3Ftab%3Dlive',
      )
    })
  })

  describe('unsafe paths → bare sign-in (open-redirect / splitting guard)', () => {
    it('drops scheme-relative //evil', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, '//evil.com')).toBe(SIGN_IN_PATH)
    })

    it('drops absolute https:// URL', () => {
      expect(
        buildSignInRedirect(SIGN_IN_PATH, 'https://attacker.com'),
      ).toBe(SIGN_IN_PATH)
    })

    it('drops backslash trick /\\evil', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, '/\\evil.com')).toBe(
        SIGN_IN_PATH,
      )
    })

    it('drops CR/LF injection (response splitting)', () => {
      expect(
        buildSignInRedirect(SIGN_IN_PATH, '/dashboard\r\nSet-Cookie: x=y'),
      ).toBe(SIGN_IN_PATH)
    })

    it('drops a relative (non-/) path', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, 'dashboard')).toBe(SIGN_IN_PATH)
    })

    it('drops the empty string', () => {
      expect(buildSignInRedirect(SIGN_IN_PATH, '')).toBe(SIGN_IN_PATH)
    })
  })
})
