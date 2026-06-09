// src/app/api/allow-list/route.spec.ts
// task-5 Step 7 — F3 CRITICAL-TA-04 spec scaffold
// GET /api/allow-list  — admin-only allow list retrieval.
// POST /api/allow-list — admin-only allow list addition.
//
// RED state (R3-E fix): it.todo → it.fails for TDD RED enforcement.
// GREEN (Step 8): replace it.fails with it() + full assertions.
// draft 08 §7.3 group: allow-list (3 endpoints).

import { describe, it } from 'vitest'

describe('GET /api/allow-list', () => {
  it.fails('200: admin が allow list の全エントリ (email / domain / default_role) を取得できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('403: member / viewer がリスト取得を試みると reject される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('500: DB クエリで予期しないエラーが発生した場合に INTERNAL_ERROR envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})

describe('POST /api/allow-list', () => {
  it.fails('201: admin が email アドレスを allow list に追加できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('201: admin がドメインパターン (*@example.com) を allow list に追加できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('403: member / viewer が追加を試みると reject される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('400: zod 不正値 (email フィールド欠如) を reject する (VALIDATION_ERROR)', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('409: 既に登録済みの email の場合 CONFLICT envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('audit_log に allow_list.add action が記録される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})
