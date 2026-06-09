// src/app/api/admin/users/[id]/role/route.spec.ts
// task-5 Step 7 — F3 CRITICAL-TA-04 spec scaffold
// PATCH /api/admin/users/:id/role — admin-only role change.
//
// RED state (R3-E fix): it.todo → it.fails for TDD RED enforcement.
// it.fails marks each case as "expected to fail" — CI will go red if Step 8
// accidentally omits implementation, and it.fails must be replaced with it()
// + real assertions when GREEN is reached.
// GREEN (Step 8): replace it.fails with it() + full assertions.
// Pattern mirrors apps/web/src/app/api/bots/route.spec.ts.

import { describe, it } from 'vitest'

describe('PATCH /api/admin/users/:id/role', () => {
  it.fails('200: admin が member の role を viewer に変更できる', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('401: 未認証リクエストを reject する (requireRole: unauthorized)', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('403: member が role 変更を試みると reject される (requireRole: forbidden)', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('400: zod 不正値 (role = "superuser") を reject する (VALIDATION_ERROR)', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('502: changeUserRole が error を返した場合に EXTERNAL_SERVICE_ERROR envelope を返す', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
  it.fails('audit_log に user.role_change action が記録される', async () => {
    throw new Error('not implemented — Step 8 GREEN pending')
  })
})
