// src/app/api/allow-list/[id]/route.spec.ts
// task-5 Step 7 — F3 CRITICAL-TA-04 spec scaffold
// DELETE /api/allow-list/:id — admin-only allow list entry removal.
//
// RED state (R3-E fix): it.todo → it.fails for TDD RED enforcement.
// GREEN (Step 8): replace it.fails with it() + full assertions.
// draft 08 §7.3 group: allow-list (3 endpoints).

import { describe, it } from 'vitest'

describe('DELETE /api/allow-list/:id', () => {
  it.fails('200: admin が allow list エントリを削除できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('403: member / viewer が削除を試みると reject される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('404: 存在しない id の場合 NOT_FOUND envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('audit_log に allow_list.remove action が記録される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('500: DB 削除で予期しないエラーが発生した場合に INTERNAL_ERROR envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})
