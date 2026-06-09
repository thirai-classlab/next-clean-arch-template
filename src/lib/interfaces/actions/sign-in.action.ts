'use server'
// src/lib/interfaces/actions/sign-in.action.ts
// task #36 Step 2 — rate-limited sign-in Server Action (OWASP A07).
// task #37 Step 7 — dead-code cleanup: signInAction (task-36 prototype) removed;
//   all callers use signInWithGoogleAction / signInWithPasswordAction (task-37).
//
// Exports:
//   signInWithGoogleAction   — Google OAuth (MOCK cookie + real redirect)
//   signInWithPasswordAction — email+password (rate-gated, MOCK cookie + real Supabase)

import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  signInWithGoogleFactory,
  signInWithPasswordFactory,
} from '@/app/api/_shared/use-case-factories'
import { getClientIp } from '@/lib/security/client-ip'
import { isSafeNext } from '@/lib/security/safe-next'
import { isMockMode } from '@/lib/env'
import type { Role } from '@/lib/domain/value-objects/role'
import { applyRateLimit, clearRateLimit, RATE_LIMIT_ENDPOINT } from './_shared/rate-limit'

// auth-login-strategy §Step 3. Session is MOCK-established by writing the
// `mock_session=<role>` cookie (H-1) — the read side already exists in
// middleware.ts / auth-helper.ts; only this write side is new.
//
// MOCK_MODE 判定は `@/lib/env` の `isMockMode()` (env-schema SSoT、default 'true')
// 経由で行う。`process.env.MOCK_MODE === 'true'` を直読みすると、env に MOCK_MODE が
// 未設定 (= schema default 'true' に依存する dev 構成) のとき `undefined === 'true'`
// で false になり、cookie set ブロックが skip され session が成立しない。container.ts
// (a8146ae) と同じ SSoT に統一する (page.tsx / container と判定が一致する)。
const MOCK_SESSION_COOKIE = 'mock_session'

// Cookie attributes (H-R2-3 / SEC-MED-01): HttpOnly + SameSite=Strict, 1h TTL.
// `secure` is gated on production so the cookie is still stored on localhost http
// (a Secure cookie is dropped over plain http), keeping MOCK 完動 on localhost.
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 3600,
  path: '/',
} as const

/**
 * Resolve the post-login redirect target from the request URL's `?next=`
 * searchParam (NOT formData — hidden-input injection is rejected, M-R2-11).
 * Falls back to `/` (M-R2-2: `/dashboard` is a 404, entry #25). The sign-in page
 * carries `?next=` in its own URL, so the request `referer` is the source.
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
 * Google sign-in Server Action used by `<form action={signInWithGoogleAction}>`.
 *  - MOCK: establish the session by writing `mock_session=<role>` and redirect('/')
 *    — the adapter's `redirectUrl` is intentionally ignored (no mock OAuth screen,
 *    LOW-R3-1).
 *  - real: redirect to the provider OAuth URL returned by the adapter.
 *
 * Returns `Promise<void>` — control leaves via `redirect()` (which throws
 * NEXT_REDIRECT). The `cookies().set` call is placed OUTSIDE any try-catch and
 * immediately before `redirect()` so the cookie is committed before the redirect
 * response is thrown (H-R2-3 ordering).
 */
export async function signInWithGoogleAction(): Promise<void> {
  const requestHeaders = await headers()
  const uc = await signInWithGoogleFactory()
  const result = await uc.execute()
  if (!result.ok) {
    // The MockAuthAdapter never errors here unless forceFail is set; for real
    // providers an outage surfaces as ExternalServiceError. Bounce back to the
    // sign-in page with an error flag rather than crashing the action.
    redirect('/auth/sign-in?error=oauth')
  }

  const target = resolvePostLoginTarget(requestHeaders.get('referer'))

  if (isMockMode()) {
    // MOCK: skip the (unused) redirectUrl and establish the session directly.
    const cookieStore = await cookies()
    cookieStore.set(MOCK_SESSION_COOKIE, mockSeedRole(), SESSION_COOKIE_OPTIONS)
    redirect(target)
  }

  // real: hand off to the provider's OAuth URL.
  redirect(result.value.redirectUrl)
}

/**
 * The MOCK seed user is an admin (mirrors MockAuthAdapter SEED_ROLE). Kept local
 * so the Google action does not need to round-trip a credential.
 */
function mockSeedRole(): Role {
  return 'admin'
}

export interface SignInWithPasswordState {
  readonly error?: string
}

/**
 * Email + password sign-in Server Action for `useFormState(...)` (react-dom).
 *  - Rate-limited (signin:password) BEFORE credential verification; cleared on
 *    success (task #36 helpers reused; respects RATE_LIMIT_ENABLED at runtime).
 *  - MOCK: seed-credential match via the UseCase → write `mock_session=<role>` →
 *    redirect(target). real: Supabase session established by the adapter.
 *
 * `password` is read into a local const, handed to the UseCase, and never logged,
 * stack-traced, or serialised into the returned state (H-4).
 */
export async function signInWithPasswordAction(
  _prevState: SignInWithPasswordState | null,
  formData: FormData,
): Promise<SignInWithPasswordState> {
  const requestHeaders = await headers()
  const ip = getClientIp(requestHeaders)

  const gate = await applyRateLimit(ip, RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD)
  if (!gate.allowed) {
    return { error: `Too many attempts. Retry in ${gate.retryAfterSec}s.` }
  }

  const email = String(formData.get('email') ?? '')
  // Local-scoped; passed to the UseCase and not retained afterwards (H-4).
  const password = String(formData.get('password') ?? '')

  const uc = await signInWithPasswordFactory()
  const result = await uc.execute({ email, password })
  if (!result.ok) {
    // Generic message only — never echo the supplied credential (H-4). The error
    // object carries no password; returning result.error.message is safe because
    // the adapter emits a fixed "invalid credentials" string.
    return { error: 'メールアドレスまたはパスワードが正しくありません。' }
  }

  // Success: clear the failure counter, then establish the session.
  await clearRateLimit(ip, RATE_LIMIT_ENDPOINT.SIGNIN_PASSWORD)

  const target = resolvePostLoginTarget(requestHeaders.get('referer'))
  if (isMockMode()) {
    // MOCK: establish the session via the mock_session cookie (H-1). cookies().set
    // OUTSIDE try-catch + immediately before redirect (H-R2-3).
    const cookieStore = await cookies()
    cookieStore.set(MOCK_SESSION_COOKIE, result.value.role, SESSION_COOKIE_OPTIONS)
  }
  // real: the Supabase adapter already established the session server-side; just
  // redirect to the resolved target.
  redirect(target)
}
