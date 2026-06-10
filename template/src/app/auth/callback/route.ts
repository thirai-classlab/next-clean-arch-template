// apps/web/src/app/auth/callback/route.ts
// task-5 Step 1: OAuth callback Route Handler.
//
// draft 08 §「Auth pages」採用: Supabase が Google OAuth 完了後に
// `<origin>/auth/callback?code=<code>&...` で本 endpoint に redirect。
// `exchangeCodeForSession(code)` で code → session 交換し、HTTP-only cookie に格納、
// 最後に root ('/') へ redirect する。
//
// 注意:
//  - failure 時 (code 不正 / session exchange 失敗) は `/auth/sign-in?error=...` に redirect
//  - Step 2 で domain check Hook が allow list 判定し、未承認 user は `/auth/pending-approval` に
//    自動 redirect される (現 Step ではそのフローは未実装、root にそのまま戻す)

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSafeNext } from '@/lib/security/safe-next'
import { logger } from '@/lib/infrastructure/logger'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // `next` query で post-login 遷移先を override 可能 (例: /admin にいたが session expire → 復帰)。
  // **open redirect 防止 (R3-A SEC-A7-2 CRITICAL)**: scheme-relative (`//evil.com`) /
  // absolute URL (`https://attacker.com`) / backslash trick (`\evil`) を reject し、
  // 不正値は無条件で `/` (root) にフォールバック。検証は `./safe-next` の `isSafeNext` を参照。
  const rawNext = searchParams.get('next') ?? '/'
  const next = isSafeNext(rawNext) ? rawNext : '/'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=missing_code`,
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // session 交換失敗: 詳細 message を URL に載せない (情報漏洩防止)、ログのみ
    // SEC-MED-04 (task-37 Step 7): console.error → pino logger (統一ログ + redact)。
    // error.message は exchangeCodeForSession が返す文字列のみで credential を含まない。
    logger.error({ msg: '[auth/callback] exchangeCodeForSession failed', err: error.message })
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=session_exchange_failed`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
