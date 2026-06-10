// src/app/api/users/[id]/route.spec.ts
// task-5 Step 7 — F3 CRITICAL-TA-04 spec scaffold
// PATCH /api/users/:id/status — admin-only user status change (suspend / unsuspend).
//
// RED state (R3-E fix): it.todo → it.fails for TDD RED enforcement.
// GREEN (Step 8): replace it.fails with it() + full assertions.
// draft 08 §7.2 group: users (4 endpoints).

import { describe, it } from 'vitest'

describe('PATCH /api/users/:id/status', () => {
  it.fails('200: admin が active ユーザーを suspended に変更できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('200: admin が suspended ユーザーを active に変更できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('403: member / viewer がステータス変更を試みると reject される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('400: zod 不正値 (status = "deleted") を reject する (VALIDATION_ERROR)', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('404: 存在しない userId の場合 NOT_FOUND envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('audit_log に user.status_change action が記録される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})
