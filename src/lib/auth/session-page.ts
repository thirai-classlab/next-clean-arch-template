// src/lib/auth/session-page.ts
// RSC-safe session resolver for Server Component PAGES (e.g. Home).
//
// Why this exists (the crux):
//   getAuthenticatedSession() (lib/interfaces/actions/_shared/auth-helper.ts)
//   resolves the session via the tsyringe container's `AuthPort`. That works in
//   the Server Action bundle ('use server' files), where container.ts's dynamic
//   adapter imports register into the resolvable container instance. It does NOT
//   work when called directly from an RSC page (a Server Component): the RSC
//   bundle calls ensureContainer() but the mock-adapter registrations are not
//   present in the RSC container graph, so container.resolve('AuthPort') throws
//   "Attempted to resolve unregistered dependency token: AuthPort" → 500.
//
//   The proven RSC-safe pattern is requireAdminPage() / assertAdmin(), which
//   bypass the container entirely: real role via Supabase getUser(), MOCK_MODE
//   via the `mock_session` cookie. This helper reuses that exact path but is
//   role-agnostic (any of admin / member / viewer) and returns a plain session
//   value, so Server Component pages can branch on auth state without touching
//   the DI container.
//
// Lookup order (mirrors auth-helper.ts / require-admin-page.ts):
//   1. requireRole(ROLES) — real Supabase getUser() + public.users SELECT.
//   2. MOCK_MODE=true && NODE_ENV !== 'production' && unauthorized → read the
//      `mock_session=<role>` cookie set by middleware (dev/MOCK fallback).
//
// The MOCK_MODE && NODE_ENV !== 'production' double-guard matches auth-helper.ts
// L47 and require-admin-page.ts L91-94: production never enters the cookie
// branch even if MOCK_MODE is accidentally set, preventing privilege escalation
// via cookie injection.

import { cookies } from 'next/headers'
import { requireRole } from '@/lib/auth/role-guard'
import { isMockMode } from '@/lib/env'
import { ROLES, type Role } from '@/lib/domain/value-objects/role'
import { SEED_EMAIL } from '@/lib/infrastructure/adapters/mock/mock-auth.seed'
import type { AuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'

/**
 * Resolve the current session for a Server Component page, or null when
 * unauthenticated. RSC-safe: does NOT resolve the tsyringe container.
 */
export async function getPageSession(): Promise<AuthenticatedSession | null> {
  // 1. Real path: Supabase server-validated role (any role passes the gate).
  //    result.email は requireRole が Supabase `user.email` を同梱したもの (未取得時 undefined)。
  const result = await requireRole(ROLES)
  if (result.kind === 'allowed') {
    return { userId: result.userId, role: result.role, email: result.email }
  }

  // 2. MOCK_MODE dev fallback: `mock_session=<role>` cookie set by middleware.
  //    MOCK_MODE は env-schema SSoT (`isMockMode()`、default 'true') 経由で判定する。
  //    `process.env.MOCK_MODE === 'true'` を直読みすると、env に MOCK_MODE 未設定の
  //    dev 構成 (schema default に依存) で undefined === 'true' = false になり、cookie
  //    fallback が skip されて login 済みでも null session になる (Home が未ログイン表示)。
  if (isMockMode() && process.env.NODE_ENV !== 'production') {
    try {
      const cookieStore = await cookies()
      const rawRole = cookieStore.get('mock_session')?.value ?? null
      if (rawRole && ROLES.includes(rawRole as Role)) {
        const role = rawRole as Role
        return { userId: `mock-user-${role}`, role, email: SEED_EMAIL }
      }
    } catch {
      // cookies() throws outside a request scope (e.g. unit tests without a
      // request context). Treat as no session — return null below.
    }
  }

  return null
}
