// src/app/auth/sign-out-nest/route.ts
// GET route handler for vps-nest-* profile sign-out.
//
// Design:
//   - POST to NEST_API_URL/auth/logout to invalidate the Nest server-side session
//     (Nest clears its own cookie and returns 200).
//   - Expire the 'nest-session-token' cookie on the Next.js side via cookies().delete().
//   - Also expire the 'mock_session' cookie (no-op if absent, safe — same as
//     the main sign-out route for consistency).
//   - Redirect to /auth/sign-in.
//
// GET is used (not POST) so that a simple <a href> or link navigation can trigger
// sign-out from the UI. CSRF is not a concern here: the server-side Nest logout call
// is initiated from the Server Action context (not a browser form POST), and the
// cookie being deleted (nest-session-token) is httpOnly, so JavaScript cannot forge
// this request. The worst a CSRF attacker can do is sign the user out, which is a
// low-severity logout CSRF — acceptable for this architecture.
//
// MOCK_MODE: skips the Nest logout call and goes straight to cookie cleanup +
// redirect (mirrors the main sign-out route's Supabase env-guard pattern).
//
// anti-bfcache: redirect response includes Cache-Control: no-store.

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

const NEST_SESSION_COOKIE = 'nest-session-token'
const MOCK_SESSION_COOKIE = 'mock_session'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const nestApiUrl = process.env.NEST_API_URL

  // Call Nest /auth/logout to clear the server-side session.
  // Skipped when NEST_API_URL is absent (MOCK_MODE or misconfiguration).
  if (nestApiUrl) {
    try {
      await fetch(`${nestApiUrl}/auth/logout`, {
        method: 'POST',
        // Forward the nest-session-token cookie so the Nest JwtAuthGuard can
        // identify (and optionally blacklist) the session.
        headers: {
          Cookie: `${NEST_SESSION_COOKIE}=${request.cookies.get(NEST_SESSION_COOKIE)?.value ?? ''}`,
        },
        credentials: 'omit',
      })
    } catch {
      // Nest server unreachable — continue to cookie cleanup + redirect.
      // A network failure during logout should not block the user from signing out.
    }
  }

  const cookieStore = await cookies()

  // Expire the Nest session cookie.
  cookieStore.set(NEST_SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // Expire the MOCK_MODE session cookie (no-op if absent; consistency with main sign-out).
  cookieStore.set(MOCK_SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

  const { origin } = new URL(request.url)
  const response = NextResponse.redirect(`${origin}/auth/sign-in`, {
    status: 302,
  })

  // anti-bfcache: do not cache the redirect response.
  response.headers.set(
    'Cache-Control',
    'private, no-store, max-age=0, must-revalidate',
  )

  return response
}
