// src/lib/infrastructure/adapters/mock/mock-auth.adapter.ts
// In-memory AuthPort for MOCK_MODE=true. Recognises `mock-token-<role>`.

import { createHash, timingSafeEqual } from 'node:crypto'
import { injectable } from 'tsyringe'
import type { AuthPort } from '../../../application/ports/auth.port'
import { ok, err, type Result } from '../../../application/result'
import {
  AuthorizationError,
  ExternalServiceError,
} from '../../../domain/errors'
import { ROLES, type Role } from '../../../domain/value-objects/role'
import { SEED_EMAIL, SEED_PASSWORD, SEED_ROLE } from './mock-auth.seed'

// Seed credentials live in the pure `./mock-auth.seed` module (no tsyringe /
// node:crypto dependency) so Server Components can import them without pulling
// the `@injectable` adapter into Next's static page-data collection (which fails
// with "tsyringe requires a reflect polyfill"). Re-exported here for backward
// compatibility with existing importers (single source of truth = mock-auth.seed).
export { SEED_EMAIL, SEED_PASSWORD } from './mock-auth.seed'

// Constant-time string equality. crypto.timingSafeEqual throws (and leaks length)
// on unequal-length buffers, so both sides are first reduced to a fixed-length
// sha256 digest. This avoids the early-exit / length-leak pattern (H-R2-5, MEDIUM-05).
function constantTimeEqual(input: string, expected: string): boolean {
  const a = createHash('sha256').update(input, 'utf8').digest()
  const b = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(a, b)
}

@injectable()
export class MockAuthAdapter implements AuthPort {
  private session: { userId: string; role: Role } | null = null
  private forceFail = false

  setForceFail(v: boolean): void {
    this.forceFail = v
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<
    Result<{ userId: string; role: Role }, AuthorizationError | ExternalServiceError>
  > {
    if (this.forceFail) {
      return err(new ExternalServiceError('mock-auth', new Error('forced')))
    }
    // Compare both factors in constant time (no early exit on email mismatch).
    const emailOk = constantTimeEqual(email, SEED_EMAIL)
    const passwordOk = constantTimeEqual(password, SEED_PASSWORD)
    if (!emailOk || !passwordOk) {
      // Generic message — never echo the supplied password/email back.
      return err(new AuthorizationError('invalid credentials'))
    }
    // Return the session payload only. Do NOT write `this.session`: the adapter is
    // a tsyringe Singleton, so in-memory session state would leak across requests
    // (M-R3-3). Source of truth for the session is the Step 3 `mock_session` cookie.
    return ok({ userId: `mock-user-${SEED_ROLE}`, role: SEED_ROLE })
  }

  async verifyToken(
    token: string,
  ): Promise<Result<{ userId: string; role: Role }, AuthorizationError>> {
    const match = /^mock-token-(.+)$/.exec(token)
    const role = match?.[1] as Role | undefined
    if (!role || !ROLES.includes(role)) {
      return err(new AuthorizationError(`invalid mock token: ${token}`))
    }
    const userId = `mock-user-${role}`
    this.session = { userId, role }
    return ok({ userId, role })
  }

  async signInWithGoogle(): Promise<
    Result<{ redirectUrl: string }, ExternalServiceError>
  > {
    if (this.forceFail) {
      return err(new ExternalServiceError('mock-auth', new Error('forced')))
    }
    return ok({ redirectUrl: 'https://mock-google-oauth/login' })
  }

  async signOut(_userId: string): Promise<Result<void, ExternalServiceError>> {
    this.session = null
    return ok(undefined as void)
  }

  async getSession(): Promise<
    Result<{ userId: string; role: Role } | null, ExternalServiceError>
  > {
    return ok(this.session)
  }
}
