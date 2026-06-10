// src/lib/interfaces/actions/_shared/auth-helper.ts
// Shared helper for Server Actions — resolves AuthPort and returns
// the authenticated session value (or null when unauthenticated).
// Draft 06 §4.2 — keeps Server Action wrappers thin (≤ 50 lines / file).
//
// MOCK_MODE path: MockAuthAdapter.session is always null in Server Action
// context (no verifyToken was called). When MOCK_MODE=true and the adapter
// returns null session, we fall back to reading `mock_session=<role>` cookie
// via `next/headers` cookies() — the same convention used by Edge middleware.
// This keeps existing unit tests (which mock AuthPort) working while enabling
// real MOCK_MODE invocations from the browser to succeed.

import { cookies } from 'next/headers'
import { container, ensureContainer } from '@/lib/infrastructure/container'
import { isMockMode } from '@/lib/env'
import type { AuthPort } from '@/lib/application/ports/auth.port'
import { ROLES, type Role } from '@/lib/domain/value-objects/role'
import { SEED_EMAIL } from '@/lib/infrastructure/adapters/mock/mock-auth.seed'

export interface AuthenticatedSession {
  readonly userId: string
  readonly role: Role
  /**
   * Display email for the signed-in user (shell avatar menu / LoginGuide).
   * Optional because the `AuthPort.getSession()` payload does not carry an
   * email; it is only populated by the MOCK cookie fallback (SEED_EMAIL) and by
   * the RSC-safe `getPageSession()` real path (Supabase `user.email`). Server
   * Actions that only need `userId` / `role` are unaffected.
   */
  readonly email?: string
}

/**
 * Returns the current session if authenticated, otherwise null.
 * Server Actions should branch on null and return `{ error: 'Unauthorized' }`.
 *
 * Lookup order:
 *  1. AuthPort.getSession() — works in production (Supabase) and in unit tests
 *     that mock the container.
 *  2. MOCK_MODE=true + null session → cookie `mock_session=<role>` fallback so
 *     real MOCK_MODE browser requests succeed (MockAuthAdapter starts null).
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  await ensureContainer()

  const authPort = container.resolve<AuthPort>('AuthPort')
  const sessionResult = await authPort.getSession()
  if (sessionResult.ok && sessionResult.value) {
    return sessionResult.value
  }

  // MOCK_MODE fallback: MockAuthAdapter always returns null (no verifyToken
  // called in SA context). Read the `mock_session` cookie that middleware sets.
  // NODE_ENV guard: cookie fallback is disabled in production even if MOCK_MODE
  // is accidentally set, preventing privilege escalation via cookie injection.
  // Parity with middleware.ts L88 defense-in-depth check.
  // MOCK_MODE は env-schema SSoT (`isMockMode()`、default 'true') 経由で判定する
  // (raw `process.env.MOCK_MODE` 直読みは env 未設定の dev 構成で false 化し session
  // fallback が skip される。session-page.ts / container.ts と同じ SSoT に統一)。
  if (isMockMode() && process.env.NODE_ENV !== 'production') {
    try {
      const cookieStore = await cookies()
      const rawRole = cookieStore.get('mock_session')?.value ?? null
      if (rawRole && ROLES.includes(rawRole as Role)) {
        const role = rawRole as Role
        return { userId: `mock-user-${role}`, role, email: SEED_EMAIL }
      }
    } catch {
      // cookies() throws outside a request scope (e.g. unit tests without
      // request context). Treat as no session — return null below.
    }
  }

  return null
}
