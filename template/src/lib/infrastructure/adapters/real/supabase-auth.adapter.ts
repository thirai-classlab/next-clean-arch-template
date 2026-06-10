// src/lib/infrastructure/adapters/real/supabase-auth.adapter.ts
// Real AuthPort adapter — Supabase Auth (Google OAuth + email/password dual).
//
// Wired by profile mapping (`PROFILE_ADAPTER_MAPPING.AuthPort = 'SupabaseAuthAdapter'`)
// and loaded lazily by container.ts (ADAPTER_MODULE_MAP['SupabaseAuthAdapter'] =
// './adapters/real/supabase-auth.adapter'). The mere existence of this file is what
// resolves the real-profile MODULE_NOT_FOUND swallow in tryRegisterFromModule (H-6);
// container.ts is intentionally NOT modified by this Step.
//
// ## Server-only
// Uses `@/lib/supabase/server` createClient() (request-scoped, cookie-backed via
// `@supabase/ssr`) and `next/headers`. MUST only be resolved from Server Components,
// Route Handlers, or Server Actions — never a Client Component.
//
// ## Session establishment boundary (M-R3-3)
// This adapter returns the session *payload* only. The Step 3 Server Action / the
// `@supabase/ssr` cookie machinery owns cookie writes. `signInWithPassword` does set
// the Supabase session cookie as a side effect of the SDK call (handled by the
// server client's cookie adapter), but the adapter itself never constructs a cookie.
//
// ## Role resolution
// `signInWithPassword` resolves the caller's role exactly like role-guard.ts:
// an RLS-applied `public.users` SELECT keyed on the authenticated user id. This is
// server-validated (no client-supplied JWT claim is trusted, NEW-N-01).
//
// ## Real smoke is user-manual scope
// Real Supabase verification (Google provider enabled, email/password provider
// enabled, public.users seeded) is performed manually by the operator — see draft
// Step 6 / D5. This Step ships the file + tsc + structural integrity only.

import { headers } from 'next/headers'
import { injectable } from 'tsyringe'
import type { AuthPort } from '../../../application/ports/auth.port'
import { ok, err, type Result } from '../../../application/result'
import { AuthorizationError, ExternalServiceError } from '../../../domain/errors'
import { ROLES, type Role } from '../../../domain/value-objects/role'
import { createClient } from '@/lib/supabase/server'

const SERVICE = 'supabase-auth'

/**
 * Narrow an unknown `role` column value to a valid `Role`, or `null`.
 * public.users.role may be NULL (row not yet provisioned) or an out-of-union
 * string; both are treated as "no role" so callers never see an invalid Role.
 */
function toRole(value: unknown): Role | null {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
    ? (value as Role)
    : null
}

@injectable()
export class SupabaseAuthAdapter implements AuthPort {
  /**
   * Verify email/password credentials and resolve the caller's role.
   *
   * - Credential mismatch (Supabase AuthApiError) → AuthorizationError with a
   *   generic message (never echoes the supplied email/password back).
   * - Provider outage / client construction failure → ExternalServiceError (H-2).
   * - Successful auth but no resolvable role (public.users row missing / RLS
   *   denial) → AuthorizationError (cannot authorize without a role).
   */
  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<
    Result<{ userId: string; role: Role }, AuthorizationError | ExternalServiceError>
  > {
    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch (cause) {
      // env unset / client construction failure → treat as provider outage.
      return err(new ExternalServiceError(SERVICE, cause))
    }

    let userId: string
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        // Invalid credentials surface as AuthApiError; map to a generic 401.
        return err(new AuthorizationError('invalid credentials'))
      }
      if (!data.user) {
        return err(new AuthorizationError('invalid credentials'))
      }
      userId = data.user.id
    } catch (cause) {
      // Network / unexpected SDK failure (not a credential mismatch).
      return err(new ExternalServiceError(SERVICE, cause))
    }

    // Resolve role via RLS-applied public.users SELECT (server-validated,
    // matches role-guard.ts — no trust in client-supplied JWT claims).
    let role: Role | null = null
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (!error && data) {
        role = toRole((data as { role: unknown }).role)
      }
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }

    if (!role) {
      // Authenticated but unprovisioned / no role → cannot authorize.
      return err(new AuthorizationError('no role assigned for user'))
    }

    return ok({ userId, role })
  }

  /**
   * Verify a Supabase access token (JWT) server-side and resolve its role.
   *
   * Uses `getUser(token)` so the token is validated against the auth server
   * (no local decode of an unverified claim). Role is resolved via the same
   * RLS-applied public.users SELECT used elsewhere.
   *
   * Any failure (invalid/expired token, env unset, missing row) maps to
   * AuthorizationError per the Port contract (verifyToken's only error type).
   */
  async verifyToken(
    token: string,
  ): Promise<Result<{ userId: string; role: Role }, AuthorizationError>> {
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)
      if (error || !user) {
        return err(new AuthorizationError('invalid token'))
      }
      const { data, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = !roleError && data ? toRole((data as { role: unknown }).role) : null
      if (!role) {
        return err(new AuthorizationError('no role assigned for user'))
      }
      return ok({ userId: user.id, role })
    } catch {
      // env unset / network failure → unauthorized (safe-by-default).
      return err(new AuthorizationError('invalid token'))
    }
  }

  /**
   * Begin the Google OAuth (PKCE) flow.
   *
   * Server-side `signInWithOAuth` does NOT redirect — it returns the provider
   * authorization URL in `data.url` (SEC/arch-M-2). The caller (Server Action)
   * is responsible for issuing the redirect to that URL.
   *
   * `redirectTo` must be an absolute URL. In a Server Action `window.location`
   * is unavailable, so the origin is reconstructed from request headers
   * (`x-forwarded-proto` / `host`, code-architect MEDIUM-4). The callback path
   * (`/auth/callback`) is handled by the existing Route Handler that exchanges
   * the PKCE code for a session.
   */
  async signInWithGoogle(): Promise<
    Result<{ redirectUrl: string }, ExternalServiceError>
  > {
    try {
      const hdrs = await headers()
      const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host')
      const proto = hdrs.get('x-forwarded-proto') ?? 'https'
      if (!host) {
        return err(
          new ExternalServiceError(
            SERVICE,
            new Error('cannot resolve request host for OAuth redirectTo'),
          ),
        )
      }
      const redirectTo = `${proto}://${host}/auth/callback`

      const supabase = await createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error || !data?.url) {
        return err(
          new ExternalServiceError(
            SERVICE,
            error ?? new Error('signInWithOAuth returned no url'),
          ),
        )
      }
      return ok({ redirectUrl: data.url })
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }

  /**
   * Sign the caller out. `userId` is accepted for Port symmetry but Supabase
   * scopes sign-out to the current session via the request cookies, so it is
   * not forwarded to the SDK.
   */
  async signOut(_userId: string): Promise<Result<void, ExternalServiceError>> {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        return err(new ExternalServiceError(SERVICE, error))
      }
      return ok(undefined as void)
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }

  /**
   * Return the current session payload (userId + role) or `null` when there is
   * no authenticated session. Uses `getUser()` (server-validated) rather than
   * `getSession()` to avoid trusting an unverified locally-cached JWT.
   */
  async getSession(): Promise<
    Result<{ userId: string; role: Role } | null, ExternalServiceError>
  > {
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error || !user) {
        return ok(null)
      }
      const { data, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = !roleError && data ? toRole((data as { role: unknown }).role) : null
      if (!role) {
        return ok(null)
      }
      return ok({ userId: user.id, role })
    } catch (cause) {
      return err(new ExternalServiceError(SERVICE, cause))
    }
  }
}
