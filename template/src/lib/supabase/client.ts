// apps/web/src/lib/supabase/client.ts
// Supabase browser-side client factory — task-5 Step 1 (draft 08 §「Supabase 3 client factory」).
//
// 用途: Client Component ('use client') から呼ぶ。
// 例: sign-in page で OAuth flow を kick (`supabase.auth.signInWithOAuth(...)`)。
// session は cookie + localStorage の hybrid で保持される (`@supabase/ssr` 既定)。
//
// 注意: anon key は public 配信 (NEXT_PUBLIC_ 接頭辞)。
// 機密 operation (admin role 変更 / allow_list CRUD 等) は必ず Server Action / Route Handler
// で server.ts factory + service role key 経由で実行すること (本ファイルでは扱わない)。
//
// E-H-01 (scope B): 現状は non-null assertion (!) で env を参照。
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY は Next.js build time に
// inline されるため、prebuild の pnpm env:validate が通過済みであれば runtime に
// undefined になることはない (build 前に exit 1 で fail する)。
// 根本修正 (validated env accessor getValidatedEnv() 導入) は Step 7 refactor で対応予定。
// next-actions.md entry: E-H-01 validated env accessor — scope A 完全修正
//   apps/web/src/lib/env.ts に getValidatedEnv(): FullEnv を実装し
//   client.ts / server.ts の non-null assertion を排除する。

import { createBrowserClient } from '@supabase/ssr'
// type import only — E-H-01 scope B: schema 型を明示して non-null assertion の意図を記録
// scripts/ は src/ の外なので相対 path で import (tsconfig @/* alias は ./src/* のみ)
// src/lib/supabase → ../../../scripts (3 levels up to apps/web root)
import type { FullEnv } from '../../../scripts/env-schema'

/**
 * Create a Supabase client for use in Client Components (browser).
 *
 * Singleton 化はしない (per-render で安全)。再生成 cost は無視できる程度。
 * 環境変数は build time に Next.js が inline するため、runtime override 不要。
 * prebuild の env:validate が通過済みの前提で non-null assertion を使用 (E-H-01 scope B)。
 */
export function createClient() {
  // Cast via FullEnv type to document the expected shape (non-null after prebuild validation)
  const url = (process.env as unknown as Partial<FullEnv>).NEXT_PUBLIC_SUPABASE_URL
  const anonKey = (process.env as unknown as Partial<FullEnv>).NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Run `pnpm env:validate` to diagnose.',
    )
  }

  return createBrowserClient(url, anonKey)
}
