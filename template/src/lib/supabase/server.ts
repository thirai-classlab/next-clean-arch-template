// apps/web/src/lib/supabase/server.ts
// Supabase server-side client factory — task-5 Step 1 (draft 08 §「Supabase 3 client factory」).
//
// 用途: Server Component / Route Handler / Server Action から呼ぶ。
// `next/headers` の `cookies()` を `@supabase/ssr` に渡して、HTTP-only cookie 経由
// で session を保持する (RSC / Server Action は localStorage 不可のため必須)。
//
// Next.js 15 App Router 仕様: `cookies()` は async function。本 factory も async。
// Server Component 内では cookies の set/remove が許可されないため try/catch で
// silent ignore する (`@supabase/ssr` 公式 README pattern)。

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Each request must instantiate a fresh client because
 * `cookies()` is request-scoped.
 *
 * 環境変数 (apps/web/.env.local で設定):
 *  - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL (e.g. https://xxx.supabase.co)
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY: project anon key (RLS 経由で安全)
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component から呼ばれた場合 `set` は no-op (Next.js が許可しない)。
            // middleware が session refresh を担当するため、ここでは silent ignore で問題なし。
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // 同上、Server Component context で silent ignore。
          }
        },
      },
    },
  )
}
