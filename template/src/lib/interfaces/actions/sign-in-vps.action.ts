'use server'
// src/lib/interfaces/actions/sign-in-vps.action.ts
// Server Actions for the vps-next-postgres profile sign-in paths.
//
// These actions replace sign-in.action.ts for the vps-next-postgres profile.
// The existing sign-in.action.ts (Supabase / MOCK paths) is untouched.
//
// Design decisions:
//   - signInWithGoogleVpsAction: calls NextAuth signIn('google') which
//     initiates the OAuth redirect via /api/auth/signin/google. The redirect
//     is handled by NextAuth and produces a JWT session cookie on callback.
//   - signInWithPasswordVpsAction: calls NextAuth signIn('credentials', {...})
//     which triggers the Credentials provider authorize() in src/auth.ts,
//     validates the password against Prisma + bcrypt, and issues a JWT session
//     cookie. This is required because the JWT must be issued by NextAuth —
//     the existing signInWithPasswordAction (Supabase path) cannot produce a
//     NextAuth JWT.
//   - Rate-limiting: reuses the same applyRateLimit/clearRateLimit helpers
//     from sign-in.action.ts (rate-limit infrastructure is profile-agnostic).
//   - ?next= redirect: same isSafeNext guard and referer resolution.

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { getClientIp } from '@/lib/security/client-ip'
import { isSafeNext } from '@/lib/security/safe-next'
import { applyRateLimit, clearRateLimit, RATE_LIMIT_ENDPOINT } from './_shared/rate-limit'
import type { SignInWithPasswordState } from './sign-in.action'

/**
 * Detect Next.js's internal redirect error (thrown by redirect() and by
 * NextAuth signIn with redirect=true).
 *
 * Checks the stable `digest` property (format: 'NEXT_REDIRECT;<type>;<url>;
 * <status>;') in addition to the error message. Message matching alone is
 * fragile across Next.js minor versions; the digest is the documented
 * mechanism Next.js itself uses to recognize redirect errors. We avoid
 * importing isRedirectError from next/dist/* because that path is not stable
 * across Next 14/15.
 */
function isNextRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
    return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('NEXT_REDIRECT')
}

/**
 * Resolve the post-login redirect target from the referer header's ?next=
 * search param (same logic as sign-in.action.ts resolvePostLoginTarget).
 */
function resolvePostLoginTarget(refererHeader: string | null): string {
  if (refererHeader) {
    try {
      const next = new URL(refererHeader).searchParams.get('next')
      if (next && isSafeNext(next)) {
        return next
      }
    } catch {
      // Unparsable referer — fall through to the default.
    }
  }
  return '/'
}

/**
 * Google sign-in Server Action for the vps-next-postgres profile.
 *
 * Calls NextAuth signIn('google') which immediately redirects to the
 * Google OAuth consent screen (/api/auth/signin/google → Google → callback).
 * On successful callback, NextAuth issues a JWT session cookie and redirects
 * to the resolved target.
 *
 * NextAuth signIn() with redirect=true (default) throws NEXT_REDIRECT.
 * We catch non-REDIRECT errors and redirect to an error page.
 */
export async function signInWithGoogleVpsAction(): Promise<void> {
  const requestHeaders = await headers()
  const target = resolvePostLoginTarget(requestHeaders.get('referer'))

  try {
    // NextAuth signIn('google') redirects to /api/auth/signin/google which
    // redirects to the Google OAuth screen. The `redirectTo` option sets the
    // post-OAuth-callback destination.
    await signIn('google', { redirectTo: target })
  } catch (error) {
    // Next.js redirect() throws an internal NEXT_REDIRECT; re-throw it so the
    // framework handles the redirect correctly.
    // Any other error falls through to the error redirect below.
    if (isNextRedirectError(error)) {
      throw error
    }
    redirect('/auth/sign-in?error=oauth')
  }
}

/**
 * Email + password sign-in Server Action for the vps-next-postgres profile.
 *
 * Calls NextAuth signIn('credentials', { email, password }) which triggers
 * the Credentials provider authorize() callback in src/auth.ts. On success,
 * NextAuth issues a JWT session cookie. On failure (wrong password / domain
 * rejected), NextAuth throws or returns an error.
 *
 * Rate-limited before credential verification (same guard as the Supabase path).
 *
 * Returns SignInWithPasswordState (compatible with useFormState) — either
 * an error message or throws NEXT_REDIRECT on success.
 */
export async function signInWithPasswordVpsAction(
  _prevState: SignInWithPasswordState | null,
  formData: FormData,
): Promise<SignInWithPasswordState> {
  const requestHeaders = await headers()
  const ip = getClientIp(requestHeaders)

  // Rate-limit BEFORE credential verification (OWASP A07, task #36).
  const gate = await applyRateLimit(ip, RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD)
  if (!gate.allowed) {
    return { error: `Too many attempts. Retry in ${gate.retryAfterSec}s.` }
  }

  const email = String(formData.get('email') ?? '')
  // Password is used only for NextAuth signIn call and never stored in state.
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' }
  }

  const target = resolvePostLoginTarget(requestHeaders.get('referer'))

  try {
    // NextAuth signIn('credentials') calls the Credentials authorize() function
    // in src/auth.ts, which validates against Prisma + bcrypt and returns a user
    // object (or null on failure). On success, NextAuth issues the JWT cookie and
    // redirects (throws NEXT_REDIRECT). On credential failure, signIn throws
    // or the authorize() callback returns null → NextAuth redirects to the error page.
    await signIn('credentials', {
      email,
      password,
      redirectTo: target,
    })
    // signIn with redirect=true (default) always throws NEXT_REDIRECT on success.
    // This line is unreachable, but TypeScript needs a return value.
    return {}
  } catch (error) {
    // Re-throw Next.js redirect (NEXT_REDIRECT is thrown on success).
    if (isNextRedirectError(error)) {
      // Success path: clear rate-limit counter before propagating the redirect.
      await clearRateLimit(ip, RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD)
      throw error
    }

    // NextAuth credentials failure: authorize() returned null → NextAuth throws
    // a CredentialsSignin error (or similar). Return a generic message (H-4).
    return { error: 'メールアドレスまたはパスワードが正しくありません。' }
  }
}
