// apps/web/src/lib/supabase/middleware.ts
// Supabase middleware session refresh helper — task-5 Step 1 (draft 08 §「Supabase 3 client factory」).
//
// 用途: Next.js Edge Middleware から呼び出し、expired token を refresh して
// HTTP-only cookie を最新の access_token に置き換える。
//
// `@supabase/ssr` 公式 pattern: middleware で `supabase.auth.getUser()` を呼ぶことで
// 内部的に session refresh + cookie 再書き込みがトリガされる。
// `getSession()` ではなく `getUser()` を使うのは server-side で必ず JWT 検証する
// ため (`getSession` は cookie 値をそのまま返すため改ざんリスクあり)。
//
// 統合方針 (task-5 Step 1):
//  - 既存 `apps/web/src/middleware.ts` の mock_session cookie role decision は維持
//  - `updateSession` を先頭で呼んで Supabase session を refresh
//  - Supabase user 情報の role 注入は Step 4 (custom_access_token_hook) で実装
//  - 現時点では「session refresh が動くこと」と「既存 decideMiddleware 経路が壊れないこと」を担保

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresh the Supabase auth session for the incoming request.
 *
 * Returns a NextResponse that **may carry updated cookies** from a token
 * refresh. Callers must continue the middleware chain on this response
 * (e.g. `return await updateSession(request)` or use it as the base
 * for further redirects).
 *
 * 既存 middleware への組み込み手順:
 *   const supabaseResponse = await updateSession(request)
 *   // ... decideMiddleware 等の追加ロジック
 *   // redirect する場合は supabaseResponse の cookies を新 response に copy する
 *
 * 環境変数 fallback (task-5 Step 1 scaffold 動作担保):
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定なら
 *   Supabase client を作らずに base response (NextResponse.next) をそのまま返す。
 *   `createServerClient` は空文字 url で同期 throw するため、`!` non-null assertion
 *   では救えない。本 fallback により .env.local 未投入時も既存 middleware の
 *   mock_session cookie 経路は機能維持する。
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 環境変数未設定: Supabase 未接続として session refresh を完全 skip。
  // 既存 cookie role 経路 (mock_session) で fallback 動作する。
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        supabaseResponse = NextResponse.next({ request })
        supabaseResponse.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        supabaseResponse = NextResponse.next({ request })
        supabaseResponse.cookies.set({ name, value: '', ...options })
      },
    },
  })

  // IMPORTANT: getUser() で必ず server-side JWT 検証する (`getSession` は使わない)。
  // 副作用として expired token があれば refresh + cookie 再書き込み発生。
  // network 失敗 / Supabase project 一時停止等の runtime 例外は graceful catch。
  try {
    await supabase.auth.getUser()
  } catch {
    // network 失敗時は session refresh を skip し、既存 cookie 経路で継続。
  }

  return supabaseResponse
}

// task-5 Step 2: pending user の承認待ち redirect 判定用に、現 session user の
// public.users.status を取得する helper。
//
// 戻り値:
//   - 'pending' / 'active' / 'suspended' : public.users.status の値
//   - null                              : 未ログイン / Supabase 未設定 / 取得失敗 / projection 行不在
//
// 設計方針:
//   - `updateSession` と同じ env fallback (URL/ANON 未設定なら null) で、.env.local 未投入時の
//     既存 mock_session 経路を壊さない (Step 1 の fallback と整合)。
//   - `getUser()` で server-side JWT 検証してから projection 行を SELECT する
//     (`getSession` の cookie 値そのまま信用は禁止)。
//   - public.users table は Step 3 で作成される前提。未作成 / RLS 拒否 / network 失敗時は
//     graceful に null を返し、redirect 判定側で「pending 確定でない限り通す」挙動にする。
export async function getSessionStatus(
  request: NextRequest,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  // status 取得専用の read-only client。cookie は request から読むだけで write しない
  // (cookie refresh は updateSession 側が担当済み)。
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {
        /* read-only: cookie write は updateSession が担当 */
      },
      remove() {
        /* read-only */
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      return null
    }

    return (data as { status: string | null }).status ?? null
  } catch {
    // public.users 未作成 (Step 3 前) / RLS 拒否 / network 失敗時は null。
    return null
  }
}

// task-5 Step 4: /admin/* gate 用に、現 session user の public.users.role を取得する helper
// (draft 08 §Phase 4 / Step 4.2、NEW-N-01)。
//
// 戻り値:
//   - 'admin' / 'member' / 'viewer' : public.users.role の値
//   - null                          : 未ログイン / Supabase 未設定 / 取得失敗 / projection 行不在
//
// 設計方針 (NEW-N-01):
//   - role は必ず `getUser()` (server-side JWT 検証) + public.users SELECT で取得する。
//     `getSession()` + JWT decode は server validation なし → role 昇格攻撃経路のため使わない。
//   - env-unset / network 失敗 / Step 3 前の未作成時は null を返し、middleware 側で
//     mock_session cookie role 経路に fallback させる (behavior-preserving)。
export async function getSessionRole(
  request: NextRequest,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  // role 取得専用の read-only client (cookie refresh は updateSession が担当済み)。
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {
        /* read-only: cookie write は updateSession が担当 */
      },
      remove() {
        /* read-only */
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      return null
    }

    return (data as { role: string | null }).role ?? null
  } catch {
    // public.users 未作成 (Step 3 前) / RLS 拒否 / network 失敗時は null。
    return null
  }
}
