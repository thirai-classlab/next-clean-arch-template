// src/lib/interfaces/middleware/auth-guard.ts
// Pure decision function for Edge Middleware (draft 06 §4.3).
// Extracted from middleware.ts to enable vitest unit testing
// without spinning up a Next.js Edge runtime.

import { isSafeNext } from '@/lib/security/safe-next'

export type MiddlewareDecision =
  | { kind: 'next' }
  /**
   * Redirect the request.
   *  - `to`: the destination *path* (always same-origin, leading `/`).
   *  - `preserveNext`: when true, the caller should append a sanitized
   *    `?next=<original pathname>` query so the user returns to the page they
   *    were trying to reach after authenticating. Only set for the
   *    unauthenticated→sign-in redirect (rule 1); the admin→dashboard redirect
   *    (rule 2) deliberately omits it.
   */
  | { kind: 'redirect'; to: string; preserveNext?: boolean }

export interface MiddlewareInput {
  readonly pathname: string
  readonly role: string | null
}

const ADMIN_PREFIX = '/admin'
const AUTH_PREFIX = '/auth'
const SIGN_IN_PATH = '/auth/sign-in'
const DASHBOARD_PATH = '/dashboard'

/**
 * Decide the response action for a request based on path and session role.
 *
 * Auth-guard policy (task: guard every route except `/auth/*`):
 *  1. Unauthenticated (role null) + path NOT under /auth
 *       → redirect /auth/sign-in (preserveNext: original path is round-tripped
 *         as `?next=` so post-login lands back on the requested page).
 *       This now covers *every* non-/auth surface — Home `/`, POC pages
 *       (`/bots`, `/realtime`, …), `/dashboard`, `/admin/*` — not just /admin.
 *  2. Authenticated + path under /admin + role !== 'admin'
 *       → redirect /dashboard (no preserveNext).
 *  3. Path under /auth (sign-in / sign-out / callback / pending-approval)
 *       → always next (pass through), preventing an infinite redirect loop
 *         because the sign-in target is itself reachable while unauthenticated.
 *  4. Otherwise (authenticated, allowed) → next (pass through).
 *
 * Static assets / `/_next/*` / `/api` are excluded upstream by the middleware
 * `config.matcher`, so they never reach this function.
 */
export function decideMiddleware(input: MiddlewareInput): MiddlewareDecision {
  const { pathname, role } = input

  // Rule 3 (explicit, ordered first): /auth/* is always public so the
  // unauthenticated→sign-in redirect below can never target a guarded page.
  if (pathname.startsWith(AUTH_PREFIX)) {
    return { kind: 'next' }
  }

  // Rule 1: any unauthenticated request to a non-/auth route → sign-in.
  if (!role) {
    return { kind: 'redirect', to: SIGN_IN_PATH, preserveNext: true }
  }

  // Rule 2: /admin/* requires the admin role; others fall back to /dashboard.
  if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
    return { kind: 'redirect', to: DASHBOARD_PATH }
  }

  // Rule 4: authenticated + allowed → pass through.
  return { kind: 'next' }
}

/**
 * Build the sign-in redirect *path* for an unauthenticated request, attaching a
 * sanitized `?next=<original path>` so the user returns to the page they were
 * trying to reach after authenticating.
 *
 * Security: the original path is round-tripped through `isSafeNext` (the same
 * open-redirect / response-splitting guard used by the OAuth callback). Only
 * same-origin absolute paths survive; anything suspicious (scheme-relative,
 * absolute URL, backslash trick, CR/LF/NUL) is dropped, yielding a bare
 * `/auth/sign-in` with no `next` param. The value is also URL-encoded so
 * query/hash characters in the original path cannot break out of the param.
 *
 * Pure function (no NextRequest dependency) so it is unit-testable without an
 * Edge runtime mock.
 *
 * @param signInPath the redirect destination (e.g. '/auth/sign-in')
 * @param originalPath the pathname the user was trying to reach
 */
export function buildSignInRedirect(
  signInPath: string,
  originalPath: string,
): string {
  if (!isSafeNext(originalPath)) {
    return signInPath
  }
  return `${signInPath}?next=${encodeURIComponent(originalPath)}`
}
