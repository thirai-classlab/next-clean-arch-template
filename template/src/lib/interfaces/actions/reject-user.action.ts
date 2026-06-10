'use server'
// src/lib/interfaces/actions/reject-user.action.ts
// Draft 06 §4.2 — thin Server Action wrapper for RejectUserUseCase.
//
// UseCase is instantiated via createRejectUserUseCase() factory (same
// pattern as Route Handlers in use-case-factories.ts) because the UseCase
// class is not @injectable and container cannot auto-resolve it by class token.

import { revalidatePath } from 'next/cache'
import { ensureContainer } from '@/lib/infrastructure/container'
import { createRejectUserUseCase } from '@/app/api/_shared/use-case-factories'
import { getAuthenticatedSession } from './_shared/auth-helper'

export type RejectUserActionResult =
  | { readonly success: true }
  | { readonly error: string }

export async function rejectUserAction(
  userId: string,
  reason: string,
): Promise<RejectUserActionResult> {
  await ensureContainer()

  const session = await getAuthenticatedSession()
  if (!session) return { error: 'Unauthorized' }
  // M-1 fix: admin-only action — a valid non-admin session must be rejected.
  if (session.role !== 'admin') return { error: 'Forbidden' }

  const useCase = await createRejectUserUseCase()
  const result = await useCase.execute({
    userId,
    adminId: session.userId,
    reason,
  })
  if (!result.ok) return { error: result.error.message }

  revalidatePath('/admin/users')
  return { success: true }
}
