// src/lib/auth/role-guard.ts
// task-5 Step 4: server-side role guard for API routes / Server Actions
// (draft 08 §Phase 4 / Step 4.3).
//
// 設計方針 (NEW-N-01 / draft 08 §4.3):
//   - role は必ず `getUser()` (server-side JWT 検証) + public.users SELECT で取得する。
//   - `getSession()` + JWT decode (atob) は server validation なし → access_token 改ざん /
//     リプレイで role 昇格が可能なため使用しない。RLS (users_select_own) 適用済 SELECT のみ。
//
// Next.js 14 互換の注記 (draft ambiguity の解消、scaffold 判断):
//   draft 08 §4.3 は Next.js 15 の `forbidden()` / `unauthorized()` (next/navigation) を呼ぶ
//   設計だったが、本 repo は next@^14.2 で両 API が未提供。よって本 scaffold では
//   throw せず `RoleCheckResult` (decision object) を返す方式に統一する。呼び出し側 (Step 5 の
//   30 API endpoint) が結果を見て 401 / 403 を返す。pure な判定部 (`evaluateRoleAccess`) を
//   切り出して vitest unit test 可能にする (Edge / Supabase 不要)。

import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'member' | 'viewer'

/**
 * Result of a server-side role check.
 *  - kind 'unauthorized' : 未ログイン (session なし)
 *  - kind 'forbidden'    : ログイン済だが role が allowed に含まれない
 *  - kind 'allowed'      : 通過 (user / role を同梱)
 */
export type RoleCheckResult =
  | { kind: 'unauthorized' }
  | { kind: 'forbidden'; role: Role }
  | { kind: 'allowed'; userId: string; role: Role; email?: string }

/**
 * Pure decision helper: given the resolved user id and role (or null when
 * unauthenticated) plus the allowed roles, return the access decision.
 *
 * Extracted from `requireRole` so the authorization rule is unit-testable
 * without a Supabase client. `role` is `null` only when there is no session.
 */
export function evaluateRoleAccess(
  userId: string | null,
  role: Role | null,
  allowed: readonly Role[],
): RoleCheckResult {
  if (!userId || !role) {
    return { kind: 'unauthorized' }
  }
  if (!allowed.includes(role)) {
    return { kind: 'forbidden', role }
  }
  return { kind: 'allowed', userId, role }
}

/**
 * Server-side role guard for API routes and Server Actions.
 *
 * Resolves the current session via `getUser()` (server-side validated) and the
 * caller's role via a RLS-applied `public.users` SELECT, then evaluates access
 * against `allowed`. Returns a `RoleCheckResult` rather than throwing so it is
 * usable from Next.js 14 route handlers (see Next-14 note above).
 *
 * env-unset / network-failure path: when the Supabase client cannot resolve a
 * user (env unset, projection row missing, RLS denial, network error) the role
 * is treated as `null` → `unauthorized`. Step 5 endpoints translate that into
 * a 401. This keeps the helper safe-by-default (no implicit admin).
 */
export async function requireRole(
  allowed: readonly Role[],
): Promise<RoleCheckResult> {
  let userId: string | null = null
  let role: Role | null = null
  let email: string | undefined

  try {
    // server.ts createClient() は async factory (Next.js 15 cookies() async 対応、
    // env 未設定時は createServerClient が throw → 下の catch で unauthorized fallback)。
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      userId = user.id
      email = user.email ?? undefined
      // RLS: users_select_own により本人 row のみ返る (tampering 不可)。
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        role = ((data as { role: Role | null }).role ?? null) as Role | null
      }
    }
  } catch {
    // Supabase 未設定 / public.users 未作成 (Step 3 前) / network 失敗時は
    // userId / role を null のままにして unauthorized 扱いにする (safe-by-default)。
  }

  const decision = evaluateRoleAccess(userId, role, allowed)
  // Attach the Supabase email to the allowed result so RSC-safe callers
  // (getPageSession → shell avatar menu) can display it. evaluateRoleAccess
  // stays pure / email-agnostic so its unit tests are unaffected.
  if (decision.kind === 'allowed' && email) {
    return { ...decision, email }
  }
  return decision
}

/**
 * Convenience guard for admin-only surfaces (Step 5 admin panel API endpoints).
 */
export async function assertAdmin(): Promise<RoleCheckResult> {
  return requireRole(['admin'])
}
