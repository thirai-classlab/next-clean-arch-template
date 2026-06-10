// src/app/(admin)/admin/_lib/require-admin-page.ts
// task-5 Step 5 — server-side admin gate for admin panel PAGES (Server Components).
//
// Two-layer gating (defense in depth):
//   1. middleware.ts already redirects non-admins away from /admin/* (real
//      Supabase role, or mock_session cookie fallback under MOCK_MODE).
//   2. This page-level guard re-checks the role server-side via role-guard's
//      assertAdmin() so a page cannot render admin data even if middleware is
//      misconfigured (draft 08 §1: "role check は必ず server helper 経由").
//
// env-unset behaviour (the crux for dev/MOCK rendering):
//   role-guard.assertAdmin() resolves the role from Supabase getUser() + a
//   public.users SELECT. When Supabase env is unset (this branch), it returns
//   `{ kind: 'unauthorized' }`. Hard-redirecting on that would make EVERY admin
//   page un-renderable in dev — defeating the scaffold goal. So:
//     - kind 'allowed' (admin)   → render
//     - kind 'forbidden' (non-admin, real session) → redirect /dashboard
//     - kind 'unauthorized' (NO session resolvable = env unset OR truly
//       logged-out) → DEFER to the middleware decision (render). The middleware
//       is the authoritative gate when no server session exists; in production
//       with Supabase wired, an unauthenticated user never reaches the page
//       because middleware already redirected them to /auth/sign-in.
//
// This keeps the page safe in production (a real non-admin session is rejected)
// while letting the dev/MOCK gallery + admin pages render without Supabase env.
//
// MOCK_MODE page-level admin gate (task-35 1d fix):
//   When assertAdmin() returns 'unauthorized' (Supabase env unset) AND
//   MOCK_MODE=true AND NODE_ENV !== 'production', fall back to the
//   `mock_session` cookie — the same convention as auth-helper.ts and
//   middleware.ts. If the cookie holds 'admin', synthesise an 'allowed' result
//   so the page renders with real store data (envDeferred stays false).
//   This resolves the stall where audit-log / users pages always showed
//   placeholder even with a valid mock_session=admin cookie.
//
//   Security note: the MOCK_MODE && NODE_ENV !== 'production' double-guard
//   matches auth-helper.ts L47. Production never enters this branch even if
//   MOCK_MODE is accidentally set, preventing cookie-based privilege escalation.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { assertAdmin, type RoleCheckResult } from '@/lib/auth/role-guard'
import { isMockMode } from '@/lib/env'

export interface AdminGateOutcome {
  /** 'admin' when a real admin session was resolved; null in env-deferred mode. */
  readonly adminId: string | null
  /** true when the gate could not resolve a session (Supabase env unset). */
  readonly envDeferred: boolean
}

/**
 * Pure decision over a RoleCheckResult: returns the gate outcome or the
 * redirect target. Extracted so the policy is unit-testable without Next.js.
 */
export function decideAdminGate(
  result: RoleCheckResult,
): { kind: 'render'; outcome: AdminGateOutcome } | { kind: 'redirect'; to: string } {
  switch (result.kind) {
    case 'allowed':
      return {
        kind: 'render',
        outcome: { adminId: result.userId, envDeferred: false },
      }
    case 'forbidden':
      // A real, authenticated non-admin session — reject.
      return { kind: 'redirect', to: '/dashboard' }
    case 'unauthorized':
      // No resolvable server session: Supabase env unset (dev/MOCK) OR genuinely
      // logged out (middleware already redirected to /auth/sign-in upstream).
      // Defer to middleware → render in the env-deferred mode.
      return {
        kind: 'render',
        outcome: { adminId: null, envDeferred: true },
      }
  }
}

/**
 * Resolve a RoleCheckResult for MOCK_MODE when the Supabase path returned
 * 'unauthorized'. Reads the `mock_session` cookie and synthesises an 'allowed'
 * result for admin cookies, keeping non-admin cookies as 'unauthorized'.
 *
 * Only active when MOCK_MODE=true AND NODE_ENV !== 'production'.
 * Returns undefined when the cookie is absent or the env guards are not met,
 * so the caller can fall through to the original 'unauthorized' result.
 *
 * @internal — exported only for unit testing.
 */
export async function resolveMockAdminGate(): Promise<RoleCheckResult | undefined> {
  // Double guard: must not activate in production even if MOCK_MODE is set.
  // MOCK_MODE は env-schema SSoT (`isMockMode()`、default 'true') 経由で判定する
  // (raw `process.env.MOCK_MODE` 直読みは env 未設定の dev 構成で mock 扱いされず、
  // mock_session=admin cookie でも admin gate が defer 表示になる)。
  if (!isMockMode() || process.env.NODE_ENV === 'production') {
    return undefined
  }

  try {
    const cookieStore = await cookies()
    const rawRole = cookieStore.get('mock_session')?.value ?? null
    if (rawRole === 'admin') {
      return { kind: 'allowed', userId: 'mock-user-admin', role: 'admin' }
    }
    // non-admin mock_session (member / viewer) — keep unauthorized so the
    // middleware-layer decision (which already blocked non-admins) stands.
    return undefined
  } catch {
    // cookies() throws outside a request context (unit tests without request
    // scope). Treat as no cookie → undefined so caller uses original result.
    return undefined
  }
}

/**
 * Server Component guard. Call at the top of every /admin page:
 *
 *   export default async function Page() {
 *     const { envDeferred } = await requireAdminPage()
 *     ...
 *   }
 *
 * Redirects (via next/navigation) when a real non-admin session is present.
 */
export async function requireAdminPage(): Promise<AdminGateOutcome> {
  let result = await assertAdmin()

  // MOCK_MODE page-gate: when Supabase cannot resolve a session (env unset),
  // fall back to the mock_session cookie to avoid forcing envDeferred on every
  // admin page load during local development.
  if (result.kind === 'unauthorized') {
    const mockResult = await resolveMockAdminGate()
    if (mockResult !== undefined) {
      result = mockResult
    }
  }

  const decision = decideAdminGate(result)
  if (decision.kind === 'redirect') {
    redirect(decision.to)
  }
  return decision.outcome
}
