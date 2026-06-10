// apps/web/src/app/auth/sign-out/route.ts
// task-5 Step 1: POST sign-out Route Handler.
//
// draft 08 §「Auth pages」採用: form submit (POST) で sign-out。
// `supabase.auth.signOut()` で server-side session + cookie をクリアし、
// sign-in page に redirect する。
//
// GET ではなく POST 限定にすることで CSRF/prefetch 経由の意図しない sign-out を防ぐ。
//
// SECURITY (CRITICAL+HIGH 修正、#8):
//  ① `mock_session` cookie の確実な失効。MOCK_MODE の session SSoT は
//     sign-in.action.ts が発行する `mock_session=<role>` cookie (httpOnly / maxAge 3600)
//     で、middleware.ts はこれを読んで /dashboard・/admin/* を認可する。
//     `supabase.auth.signOut()` は Supabase 系 cookie しか消さないため、本 route で
//     `mock_session` を maxAge:0 で明示失効しないと logout 後も最大 1h 認可が残存する。
//  ② anti-bfcache。redirect 応答に `Cache-Control: no-store` を付与し、
//     ブラウザ「戻る」での bfcache 復元 (認証済 page の email/role/admin UI 露出) を防ぐ。
//     保護 page 側 (no-store) は middleware + (admin)/layout の force-dynamic で担保。
//
// SECURITY (MEDIUM-1 回帰修正、#8 再レビュー conf 0.87):
//  純 MOCK_MODE (Supabase env 未設定) では `createClient()` 内の
//  `createServerClient(url!, key!, …)` が空/undefined url で **同期 throw** する
//  (@supabase/ssr: "Your project URL and API key are required …")。env-schema.ts は
//  NEXT_PUBLIC_SUPABASE_URL を `.optional()` とし「MOCK_MODE で API key 無しデモ可能」を
//  保証しているため、route が throw を catch しないと sign-out が 500 で落ち、
//  下記 ① mock_session 失効に到達せず cookie 残存 = 認可残存となる。
//  middleware.ts の env early-exit と整合させ、Supabase teardown を
//  env 存在チェック + try-catch で囲い、Supabase 不在/失敗でも必ず
//  mock_session 失効 + redirect に到達させる。
//
// vps-next-postgres / vps-next-mariadb: when DEPLOY_PROFILE is either NextAuth
//  profile, call NextAuth signOut({ redirect: false }) to invalidate the JWT
//  session cookie. Both profiles share the identical NextAuth v5 JWT session
//  stack (only the database provider differs), so the teardown must fire for
//  both — otherwise a signed-out user's JWT cookie stays valid until natural
//  expiry (HIGH fix; mirrors middleware.ts / sign-in/page.tsx).
//  The mock_session cookie clearing still runs (no-op if not set, safe).
//  Supabase signOut is skipped when Supabase env vars are absent.
//
// vps-nest-postgres / vps-nest-mariadb (HIGH fix): all logout UI (LoginGuide,
//  UserMenu, pending-approval) POSTs to THIS route, but the Nest profiles'
//  session lives in the 'nest-session-token' httpOnly cookie issued by the
//  Nest API. Without clearing it here, logout leaves the JWT session live for
//  up to 1h. Mirroring the NEXTAUTH_PROFILES pattern: best-effort POST to
//  NEST_API_URL/auth/logout (server-side teardown), then expire the
//  nest-session-token cookie with the same attributes it was issued with
//  (path=/, httpOnly, sameSite=lax).

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getValidatedEnv } from '@/lib/env'

// MOCK_MODE session SSoT cookie 名 (sign-in.action.ts MOCK_SESSION_COOKIE と一致)。
const MOCK_SESSION_COOKIE = 'mock_session'

// Nest profile session cookie 名 (api/src/auth/auth.controller.ts COOKIE_NAME と一致)。
const NEST_SESSION_COOKIE = 'nest-session-token'

// Deploy profiles that use the NextAuth v5 JWT session stack — their session
// cookie must be torn down via NextAuth signOut() on logout.
const NEXTAUTH_PROFILES: ReadonlyArray<string> = [
  'vps-next-postgres',
  'vps-next-mariadb',
]

// Deploy profiles whose session is the Nest-issued HS256 JWT cookie — the
// nest-session-token cookie must be expired on logout (HIGH fix).
const NEST_PROFILES: ReadonlyArray<string> = [
  'vps-nest-postgres',
  'vps-nest-mariadb',
]

/**
 * Resolve DEPLOY_PROFILE via the env schema SSoT, falling back to raw
 * process.env when validation fails (sign-out must stay graceful).
 */
function resolveDeployProfile(): string {
  try {
    return getValidatedEnv().DEPLOY_PROFILE
  } catch {
    return process.env.DEPLOY_PROFILE ?? ''
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── vps-next-postgres / vps-next-mariadb: NextAuth session teardown ──────
  // NextAuth signOut() clears the JWT session cookie (__Secure-authjs.session-token
  // in production, authjs.session-token in dev). redirect: false so we control
  // the redirect ourselves below.
  //
  // DEPLOY_PROFILE is resolved via getValidatedEnv() (schema SSoT — same as
  // sign-in/page.tsx) rather than raw process.env. getValidatedEnv() throws on
  // invalid env, but sign-out must stay graceful (the mock_session cleanup
  // below has to run no matter what), so fall back to the raw env on failure.
  const deployProfile = resolveDeployProfile()
  const isNextAuthProfile = NEXTAUTH_PROFILES.includes(deployProfile)
  const isNestProfile = NEST_PROFILES.includes(deployProfile)
  if (isNextAuthProfile) {
    try {
      // 'as string' prevents webpack from statically tracing '@/auth' (src/auth.ts)
      // into the vercel/pro bundle. The CLI post-clone step prunes src/auth.ts for
      // vercel/pro (Supabase-based auth), so webpack must not resolve it at build time.
      // Safe at runtime: this branch is only reached when DEPLOY_PROFILE is a
      // vps-next-* variant (NEXTAUTH_PROFILES), where src/auth.ts always exists.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const authMod = await import('@/auth' as string)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const { signOut } = authMod as { signOut: (opts: { redirect: boolean }) => Promise<void> }
      await signOut({ redirect: false })
    } catch {
      // NextAuth signOut failure — continue to cookie cleanup + redirect.
      // This can happen if NEXTAUTH_SECRET is missing (misconfiguration) or
      // the cookie is already invalid/expired.
    }
  }

  // ── vps-nest-postgres / vps-nest-mariadb: Nest session teardown (HIGH fix) ─
  // Best-effort server-side logout (Nest clears its own cookie scope), then the
  // nest-session-token cookie is expired below regardless of this call's outcome.
  if (isNestProfile) {
    const nestApiUrl = process.env.NEST_API_URL
    if (nestApiUrl) {
      try {
        await fetch(`${nestApiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            Cookie: `${NEST_SESSION_COOKIE}=${request.cookies.get(NEST_SESSION_COOKIE)?.value ?? ''}`,
          },
          credentials: 'omit',
        })
      } catch {
        // Nest unreachable — cookie expiry below still revokes the session
        // on the browser side.
      }
    }
  }

  // ── Supabase session teardown ─────────────────────────────────────────────
  // Supabase signOut は Supabase 系 cookie しか消さないため、env 存在確認してから呼ぶ。
  // 純 MOCK_MODE (env 未設定) では createServerClient が同期 throw するため、
  // env 存在を確認してから呼び、さらに try-catch で囲って network 失敗等でも
  // 必ず後続の mock_session 失効 + redirect に到達させる
  // (middleware.ts:51-53 の env early-exit と同方針)。
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = await createClient()
      // signOut() は cookie 削除のみ、failure しても sign-in に redirect する (graceful)。
      await supabase.auth.signOut()
    } catch {
      // Supabase 不在/到達不可 — mock_session 失効 + redirect は継続する。
    }
  }

  // ① MOCK_MODE の session SSoT cookie を確実に失効させる。
  // 発行時 (sign-in.action.ts SESSION_COOKIE_OPTIONS) の path / httpOnly / sameSite を
  // 揃えて maxAge:0 で上書きしないと、ブラウザは別属性の cookie として残す可能性がある。
  const cookieStore = await cookies()
  cookieStore.set(MOCK_SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

  // ①' vps-nest-* profiles: expire the Nest-issued JWT session cookie (HIGH fix).
  // Attributes mirror issuance (auth.controller.ts: path=/, httpOnly,
  // sameSite=lax) so the browser overwrites the same cookie.
  if (isNestProfile) {
    cookieStore.set(NEST_SESSION_COOKIE, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  const { origin } = new URL(request.url)
  const response = NextResponse.redirect(`${origin}/auth/sign-in`, {
    // 303 See Other: POST → GET 遷移を明示。
    status: 303,
  })

  // ② anti-bfcache: redirect 応答自体をキャッシュさせない。
  response.headers.set(
    'Cache-Control',
    'private, no-store, max-age=0, must-revalidate',
  )

  return response
}
