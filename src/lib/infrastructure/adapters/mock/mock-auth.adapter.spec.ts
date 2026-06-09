// src/lib/infrastructure/adapters/mock/mock-auth.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockAuthAdapter } from './mock-auth.adapter'
import { AuthorizationError, ExternalServiceError } from '../../../domain/errors'

describe('MockAuthAdapter', () => {
  let adapter: MockAuthAdapter

  beforeEach(() => {
    adapter = new MockAuthAdapter()
  })

  describe('verifyToken', () => {
    it('returns userId + role for the mock-token-* prefix', async () => {
      const r = await adapter.verifyToken('mock-token-admin')
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.role).toBe('admin')
        expect(r.value.userId).toBeTruthy()
      }
    })

    it('returns AuthorizationError for an invalid token', async () => {
      const r = await adapter.verifyToken('garbage')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
    })
  })

  describe('signInWithGoogle', () => {
    it('returns a deterministic mock redirect URL', async () => {
      const r = await adapter.signInWithGoogle()
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value.redirectUrl).toContain('mock-google-oauth')
    })

    it('returns ExternalServiceError when force_fail=true', async () => {
      adapter.setForceFail(true)
      const r = await adapter.signInWithGoogle()
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(ExternalServiceError)
    })
  })

  describe('signOut', () => {
    it('clears the session', async () => {
      await adapter.verifyToken('mock-token-member')
      const r = await adapter.signOut('user-1')
      expect(r.ok).toBe(true)
    })
  })

  describe('getSession', () => {
    it('returns null when no session', async () => {
      const r = await adapter.getSession()
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBeNull()
    })

    it('returns session after verifyToken seeds state', async () => {
      await adapter.verifyToken('mock-token-viewer')
      const r = await adapter.getSession()
      expect(r.ok).toBe(true)
      if (r.ok && r.value) expect(r.value.role).toBe('viewer')
    })
  })

  // task #37 Step 2 — email-pass sign-in (timing-safe seed compare).
  describe('signInWithPassword', () => {
    // Seed defaults (MOCK_SEED_* unset in the test env → literals are active).
    const SEED_EMAIL = 'test@classlab.co.jp'
    const SEED_PASSWORD = 'password123'

    it('returns Result.ok with userId + admin role when seed credentials match', async () => {
      const r = await adapter.signInWithPassword(SEED_EMAIL, SEED_PASSWORD)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toEqual({ userId: 'mock-user-admin', role: 'admin' })
    })

    it('returns AuthorizationError when the password is wrong', async () => {
      const r = await adapter.signInWithPassword(SEED_EMAIL, 'wrong-password')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
    })

    it('returns AuthorizationError when the email is wrong', async () => {
      const r = await adapter.signInWithPassword('intruder@evil.com', SEED_PASSWORD)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
    })

    it('returns ExternalServiceError when forceFail is set (provider outage)', async () => {
      adapter.setForceFail(true)
      const r = await adapter.signInWithPassword(SEED_EMAIL, SEED_PASSWORD)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(ExternalServiceError)
    })

    it('does NOT write this.session — getSession() stays null after success (M-R3-3)', async () => {
      // Singleton cross-request leakage guard: the session field must stay null.
      const signIn = await adapter.signInWithPassword(SEED_EMAIL, SEED_PASSWORD)
      const session = await adapter.getSession()
      expect(signIn.ok).toBe(true)
      expect(session.ok).toBe(true)
      if (session.ok) expect(session.value).toBeNull()
    })

    it('never surfaces the supplied password (no password key, not echoed in error)', async () => {
      const secret = 'super-secret-pw-123'
      const okResult = await adapter.signInWithPassword(SEED_EMAIL, SEED_PASSWORD)
      const failResult = await adapter.signInWithPassword(SEED_EMAIL, secret)
      if (okResult.ok) {
        expect(Object.keys(okResult.value)).not.toContain('password')
      }
      if (!failResult.ok) {
        expect(failResult.error.message).not.toContain(secret)
        expect(JSON.stringify(failResult.error)).not.toContain(secret)
      }
    })

    // FIX-C-1: timing-safe boundary conditions — empty and oversized inputs
    // must not crash and must return AuthorizationError (not throw).
    it('returns AuthorizationError (no crash) for empty email', async () => {
      const r = await adapter.signInWithPassword('', SEED_PASSWORD)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
    })

    it('returns AuthorizationError (no crash) for empty password', async () => {
      const r = await adapter.signInWithPassword(SEED_EMAIL, '')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
    })

    it('returns AuthorizationError (no crash) for very long email and password strings', async () => {
      const r = await adapter.signInWithPassword(
        'a'.repeat(10000),
        'b'.repeat(10000),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
    })
  })

  // FIX-C-1: design intent comment for getSession-after-verifyToken
  // verifyToken intentionally writes this.session (it is called by the
  // middleware/cookie validation path, which is the legitimate writer).
  // signInWithPassword does NOT write this.session (M-R3-3: the adapter is a
  // tsyringe Singleton and in-memory session state would leak across requests;
  // the source of truth for the session is the Step 3 `mock_session` cookie).
  // The test below already asserts M-R3-3 for signInWithPassword. The sibling
  // "returns session after verifyToken seeds state" test in the getSession suite
  // asserts the legitimate write path for verifyToken.
})
