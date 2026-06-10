'use server'
// src/lib/interfaces/actions/sign-in-vps-nest.action.ts
// Server Actions for the vps-nest-postgres / vps-nest-mariadb profile sign-in paths.
//
// These actions replace sign-in.action.ts and sign-in-vps.action.ts for the
// vps-nest-* profiles. All existing action files are untouched.
//
// Design decisions:
//   - signInWithGoogleNestAction: redirects to NEST_API_URL/auth/google which
//     triggers the Nest passport-google-oauth20 redirect flow. Returns void
//     (control leaves via redirect()).
//   - signInWithPasswordNestAction: POSTs {email, password} to
//     NEST_API_URL/auth/login. On success, Nest returns Set-Cookie with
//     'nest-session-token' (httpOnly, sameSite=lax). The Server Action reads the
//     Set-Cookie response header and proxies the cookie to the browser via
//     next/headers cookies().set(). This avoids NEXT_PUBLIC_ secret leakage and
//     maintains CSRF safety (Server Actions are same-origin-enforced by Next.js).
//   - Rate-limiting: reuses the same applyRateLimit / clearRateLimit helpers from
//     sign-in.action.ts (rate-limit infrastructure is profile-agnostic).
//   - ?next= redirect: same isSafeNext guard and referer resolution as the other
//     vps action files.
//   - MOCK_MODE: when MOCK_MODE=true (isMockMode() returns true), the Nest API
//     is not running. The Server Actions fall back to the mock_session cookie
//     (same as the Supabase mock path) so CI / local MOCK builds stay green.
//
// Security notes:
//   - NEST_API_URL is a private env var (not NEXT_PUBLIC_). It is read by the
//     Server Action on the server side and never sent to the browser bundle.
//   - The Nest JWT cookie is proxied back via cookies().set() in the Server Action
//     response, not by returning it from client code — credential never touches
//     the client bundle.

import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getClientIp } from '@/lib/security/client-ip'
import { isSafeNext } from '@/lib/security/safe-next'
import { isMockMode } from '@/lib/env'
import { applyRateLimit, clearRateLimit, RATE_LIMIT_ENDPOINT } from './_shared/rate-limit'
import type { SignInWithPasswordState } from './sign-in.action'

/** Cookie name issued by Nest (must match api/src/auth/auth.service.ts). */
const NEST_SESSION_COOKIE = 'nest-session-token'

/** Mock session cookie name (SSoT with sign-in.action.ts). */
const MOCK_SESSION_COOKIE = 'mock_session'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const, // lax is required for OAuth callback cross-origin redirect
  secure: process.env.NODE_ENV === 'production',
  maxAge: 3600,
  path: '/',
}

/**
 * Detect Next.js's internal redirect error (thrown by redirect()).
 * Checks the stable `digest` property in addition to the error message.
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
 * search param (same logic as sign-in-vps.action.ts).
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
 * Google sign-in Server Action for the vps-nest-* profiles.
 *
 * Redirects to NEST_API_URL/auth/google which triggers the Nest
 * passport-google-oauth20 redirect flow. On successful callback, Nest issues
 * the HS256 JWT cookie and redirects to NEXT_PUBLIC_APP_URL (or '/').
 *
 * MOCK_MODE: establishes a mock_session=admin cookie and redirects to '/'
 * (no Nest server running in MOCK builds).
 */
export async function signInWithGoogleNestAction(): Promise<void> {
  const requestHeaders = await headers()
  const target = resolvePostLoginTarget(requestHeaders.get('referer'))

  if (isMockMode()) {
    const cookieStore = await cookies()
    cookieStore.set(MOCK_SESSION_COOKIE, 'admin', SESSION_COOKIE_OPTIONS)
    redirect(target)
  }

  const nestApiUrl = process.env.NEST_API_URL
  if (!nestApiUrl) {
    redirect('/auth/sign-in?error=oauth')
  }

  // Redirect to the Nest Google OAuth initiation endpoint.
  // Nest's GoogleAuthGuard will redirect to accounts.google.com.
  redirect(`${nestApiUrl}/auth/google`)
}

/**
 * Email + password sign-in Server Action for the vps-nest-* profiles.
 *
 * POSTs {email, password} to NEST_API_URL/auth/login. On a 200 response, reads
 * the 'Set-Cookie' header from Nest, extracts the 'nest-session-token' value, and
 * proxies it to the browser via next/headers cookies().set(). On a 401 response,
 * returns an error message.
 *
 * Rate-limited before credential verification (OWASP A07, task #36).
 * Returns SignInWithPasswordState (compatible with useActionState / useFormState).
 *
 * MOCK_MODE: falls back to mock_session cookie (no Nest server required).
 */
export async function signInWithPasswordNestAction(
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
  // Password is passed to the Nest API and never retained in state (H-4).
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' }
  }

  const target = resolvePostLoginTarget(requestHeaders.get('referer'))

  if (isMockMode()) {
    // MOCK_MODE: skip the Nest API call and establish session via mock_session cookie.
    // The MockAuthAdapter validates test@classlab.co.jp / password123 via the
    // use-case factory; here we accept any non-empty credentials in MOCK mode
    // for simplicity (the middleware only reads the cookie role, not the credentials).
    await clearRateLimit(ip, RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD)
    const cookieStore = await cookies()
    // Use 'member' role for password sign-in mock (mirrors MockAuthAdapter behavior).
    cookieStore.set(MOCK_SESSION_COOKIE, 'member', SESSION_COOKIE_OPTIONS)
    redirect(target)
  }

  const nestApiUrl = process.env.NEST_API_URL
  if (!nestApiUrl) {
    return { error: 'NEST_API_URL is not configured.' }
  }

  let response: Response
  try {
    response = await fetch(`${nestApiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      // Do not forward the user's browser cookies to the Nest server — we proxy
      // the cookie back ourselves after a successful login.
      credentials: 'omit',
    })
  } catch {
    // Network error (Nest server unreachable).
    return { error: 'サーバーへの接続に失敗しました。しばらくしてから再試行してください。' }
  }

  if (response.status === 401) {
    return { error: 'メールアドレスまたはパスワードが正しくありません。' }
  }

  if (!response.ok) {
    return { error: 'サインイン中にエラーが発生しました。もう一度お試しください。' }
  }

  // Success: proxy the nest-session-token cookie to the browser.
  // The Nest response includes 'Set-Cookie: nest-session-token=<jwt>; ...'
  // Extract it and forward it via next/headers cookies().set().
  const setCookieHeader = response.headers.get('set-cookie')
  if (setCookieHeader) {
    const tokenMatch = setCookieHeader.match(/nest-session-token=([^;]+)/)
    if (tokenMatch?.[1]) {
      const cookieStore = await cookies()
      cookieStore.set(NEST_SESSION_COOKIE, tokenMatch[1], SESSION_COOKIE_OPTIONS)
    }
  }

  // Clear the rate-limit counter on success.
  await clearRateLimit(ip, RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD)

  try {
    redirect(target)
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    return { error: 'リダイレクトに失敗しました。' }
  }
}
