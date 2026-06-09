'use server'
// src/lib/interfaces/actions/change-user-role.action.ts
// Draft 06 §4.2 — thin Server Action wrapper for ChangeUserRoleUseCase.
//
// 3 層防護 (B SEC-H6 / task-5 Step 7 Round-1 HIGH):
//   (1) DB layer — supabase/migrations/009_last_admin_protection.sql の
//                  prevent_last_admin_demotion trigger が role 数 1 ⇒ 0 を reject。
//   (2) API layer (本 file) — self-demote (target == self ∧ newRole != 'admin') を関数冒頭で reject。
//                  race-safe な last-admin 防護は DB trigger に委譲 (本 file では先回り判定しない)。
//   (3) Test layer — supabase/tests/last_admin_protection.test.sql の pgTAP 5 case が DB 層を検証。
//                  本 file の self-demote guard は change-user-role.action.spec.ts で検証する。
//
// UseCase is instantiated via createChangeUserRoleUseCase() factory (same
// pattern as Route Handlers in use-case-factories.ts) because the UseCase
// class is not @injectable and container cannot auto-resolve it by class token.

import { revalidatePath } from 'next/cache'
import { ensureContainer } from '@/lib/infrastructure/container'
import { createChangeUserRoleUseCase } from '@/app/api/_shared/use-case-factories'
import type { Role } from '@/lib/domain/value-objects/role'
import { getAuthenticatedSession } from './_shared/auth-helper'

export type ChangeUserRoleActionResult =
  | { readonly success: true }
  | { readonly error: string }

export async function changeUserRoleAction(
  userId: string,
  newRole: Role,
): Promise<ChangeUserRoleActionResult> {
  await ensureContainer()

  const session = await getAuthenticatedSession()
  if (!session) return { error: 'Unauthorized' }
  // M-1 fix: admin-only action — a valid non-admin session must be rejected.
  if (session.role !== 'admin') return { error: 'Forbidden' }

  // B SEC-H6 (Round-1 HIGH): self-demote guard。
  //   admin が自分自身を admin 以外に変更しようとする UX 事故を API 層で先回り reject する。
  //   (last-admin 全体の race-safe 防護は DB trigger 009_last_admin_protection.sql に委譲)
  if (userId === session.userId && newRole !== 'admin') {
    return { error: 'self_demote_forbidden' }
  }

  const useCase = await createChangeUserRoleUseCase()
  const result = await useCase.execute({
    userId,
    newRole,
    adminId: session.userId,
  })
  if (!result.ok) return { error: result.error.message }

  revalidatePath('/admin/users')
  return { success: true }
}
