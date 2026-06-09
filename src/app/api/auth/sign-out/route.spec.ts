// src/app/api/auth/sign-out/route.spec.ts
// task-5 Step 7 — F3 CRITICAL-TA-04 spec scaffold
// POST /api/auth/sign-out — sign out current session.
//
// RED state (R3-E fix): it.todo → it.fails for TDD RED enforcement.
// GREEN (Step 8): replace it.fails with it() + full assertions.
// draft 08 §7.1 group: auth (3 endpoints).

import { describe, it } from 'vitest'

describe('POST /api/auth/sign-out', () => {
  it.fails('200: 認証済みセッションをサインアウトし、セッション cookie を削除する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('200: レスポンスに success: true が含まれる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('audit_log に auth.sign_out action が記録される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('500: Supabase signOut が失敗した場合に INTERNAL_ERROR envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})
