// src/app/api/users/route.spec.ts
// task-5 Step 7 — F3 CRITICAL-TA-04 spec scaffold
// GET /api/users — admin-only user list with pagination.
//
// RED state (R3-E fix): it.todo → it.fails for TDD RED enforcement.
// GREEN (Step 8): replace it.fails with it() + full assertions.
// draft 08 §7.2 group: users (4 endpoints).

import { describe, it } from 'vitest'

describe('GET /api/users', () => {
  it.fails('200: admin がユーザー一覧 (id / email / role / status) をページネーション付きで取得できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('403: member / viewer が一覧取得を試みると reject される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('400: page パラメーターが不正な値 (page=abc) の場合 VALIDATION_ERROR を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('200: レスポンスに total / page / limit のメタデータが含まれる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('500: DB クエリで予期しないエラーが発生した場合に INTERNAL_ERROR envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})
