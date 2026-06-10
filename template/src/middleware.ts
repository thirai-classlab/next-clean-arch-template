// apps/web/src/middleware.ts
// Next.js Edge Middleware — auth + role guard (draft 06 §4.3 / Wave 6-M).
//
// Next.js 14 + src/app convention: middleware は apps/web/src/middleware.ts に配置。
// project root に置くと Next.js が auto-detect しないため redirect/rewrite が無効化される。
//
// MOCK_MODE 妥協: Edge runtime は tsyringe + dynamic import 非対応のため
// container 経由ではなく cookie `mock_session=<role>` から inline で session を解決する。
//
// task-5 Step 1: Supabase session refresh を `updateSession` 経由で先頭で実行する。
// `updateSession` は token expire 時に cookie を更新するため、その結果 response を
// base にして以降の decideMiddleware redirect を組み立てる必要がある。
// role は Supabase session を優先し、MOCK_MODE 用に mock_session cookie へ fallback する。
// 未認証 (role=null) は decideMiddleware rule1 で /auth/sign-in?next= へ redirect される。

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  buildSignInRedirect,
  decideMiddleware,
} from '@/lib/interfaces/middleware/auth-guard'
import {
  getSessionRole,
  getSessionStatus,
  updateSession,
} from '@/lib/supabase/middleware'

// task-5 Step 2: pending status の user を承認待ち page へ誘導する際、
// redirect loop を避けるため判定を skip する path prefix。
// /auth/* (sign-in / callback / sign-out / pending-approval 自身) は素通しする。
const PENDING_REDIRECT_TARGET = '/auth/pending-approval'
const PENDING_CHECK_SKIP_PREFIXES = ['/auth/']

// SECURITY (#8 HIGH, anti-bfcache): 認証済 page・auth フローの応答には no-store を付与し、
// logout 後の「戻る」で email / role / admin UI が bfcache 復元されるのを防ぐ。
// matcher が既に api / _next / 静的アセットを除外しているため、ここで対象になるのは
// page navigation のみ。さらに「認証 session 有り」または「/auth/* フロー」に限定して
// 付与し、完全に匿名の public navigation までキャッシュ不能にしない (targeted 方式)。
const NO_STORE_CACHE_CONTROL = 'private, no-store, max-age=0, must-revalidate'

function applyNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', NO_STORE_CACHE_CONTROL)
  return response
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // task-5 Step 1: Supabase session を先に refresh。
  // 戻り値 response は refresh 済 cookie を持つ「素通し base」。
  // 環境変数未設定 / Supabase 到達不可時は updateSession 内で graceful catch し、
  // 既存 cookie role 経路 (mock_session) が引き続き機能する。
  const supabaseResponse = await updateSession(request)

  // task-5 Step 2: pending status の user は承認待ち page へ誘導する。
  // /auth/* は redirect loop 回避のため skip。getSessionStatus は Supabase 未設定 /
  // public.users 未作成 (Step 3 前) / 未ログイン時に null を返すため、'pending' が
  // 確定した場合のみ redirect する (= 非 pending user は完全に behavior-preserving)。
  const pathname = request.nextUrl.pathname
  const skipPendingCheck = PENDING_CHECK_SKIP_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  )
  if (!skipPendingCheck) {
    const status = await getSessionStatus(request)
    if (status === 'pending') {
      const pendingResponse = NextResponse.redirect(
        new URL(PENDING_REDIRECT_TARGET, request.url),
      )
      for (const cookie of supabaseResponse.cookies.getAll()) {
        pendingResponse.cookies.set(cookie)
      }
      // pending user (= 認証済) の誘導応答はキャッシュさせない。
      return applyNoStore(pendingResponse)
    }
  }

  // task-5 Step 4: /admin/* gate の role 解決 (draft 08 §Phase 4 / Step 4.2、NEW-N-01)。
  // 真の role は Supabase session (getUser() + public.users SELECT) を優先する。
  // getSessionRole は Supabase 未設定 / 未ログイン / Step 3 前の未作成時に null を返すため、
  // その場合は MOCK_MODE 用の mock_session cookie へ fallback する。
  // どちらも無い場合 role=null のまま → decideMiddleware rule1 が /auth/sign-in?next= へ
  // redirect する (= 未認証は確実に guard される。dev でも未ログインなら admin にならない)。
  //
  // task-5 Step 7 Round-3 A MEDIUM-N4: mock_session cookie は NODE_ENV guard で production では
  // 必ず null にする。production では .env.production に意図せず mock_session が設定されても無効化される。
  const supabaseRole = await getSessionRole(request)
  const cookieRole =
    process.env.NODE_ENV !== 'production'
      ? (request.cookies.get('mock_session')?.value ?? null)
      : null
  const role = supabaseRole ?? cookieRole
  const decision = decideMiddleware({
    pathname: request.nextUrl.pathname,
    role,
  })

  if (decision.kind === 'redirect') {
    // For the unauthenticated→sign-in redirect, round-trip the original path as
    // a sanitized `?next=` so the user lands back on the requested page after
    // login. `buildSignInRedirect` applies the open-redirect / response-splitting
    // guard (isSafeNext) and URL-encodes the value; unsafe paths degrade to a
    // bare /auth/sign-in. The admin→dashboard redirect (preserveNext absent)
    // keeps a plain target.
    const redirectTarget = decision.preserveNext
      ? buildSignInRedirect(decision.to, request.nextUrl.pathname)
      : decision.to
    const redirectResponse = NextResponse.redirect(
      new URL(redirectTarget, request.url),
    )
    // refresh で更新された Supabase cookie を redirect 応答にも copy する
    // (こうしないと token rotation 直後の redirect で古い cookie が残る)。
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie)
    }
    // auth guard の redirect 応答 (未認証→sign-in / admin gate→dashboard) は
    // 認可状態に依存するため no-store にし、bfcache 復元を防ぐ。
    return applyNoStore(redirectResponse)
  }

  // pass-through: 認証 session が解決できた page navigation のみ no-store。
  // role=null (完全匿名) の public navigation は targeted 方式でキャッシュ可能のまま。
  if (role !== null) {
    return applyNoStore(supabaseResponse)
  }
  return supabaseResponse
}

// Auth-guard matcher. Now that *every* non-/auth route is guarded (not just
// /admin), the matcher must exclude paths that are never authenticated surfaces,
// otherwise asset/static requests would be redirected to sign-in:
//   - api            : API route handlers manage their own auth (e2e relies on
//                      this bypass; /api/** must not 307 to sign-in)
//   - _next/*        : ALL Next.js internals (static, image, data, etc.) — broadened
//                      from the previous _next/static|_next/image to cover _next/data
//                      and any future _next subpath
//   - favicon.ico    : browser-requested favicon
//   - *.<ext>        : public static assets by extension (svg, png, jpg, jpeg,
//                      gif, webp, ico, css, js, map, woff, woff2, ttf, txt, xml)
// `/auth/*` is intentionally NOT excluded here — it still hits the middleware so
// decideMiddleware can pass it through (rule 3), keeping the session-refresh and
// pending-approval logic active on auth pages.
export const config = {
  matcher: [
    '/((?!api|_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|txt|xml)$).*)',
  ],
}
