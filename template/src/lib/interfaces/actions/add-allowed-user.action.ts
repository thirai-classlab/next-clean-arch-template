'use server'
// src/lib/interfaces/actions/add-allowed-user.action.ts
// Draft 06 §4.2 — thin Server Action wrapper for AddAllowedUserUseCase.
//
// UseCase is instantiated via createAddAllowedUserUseCase() factory (same
// pattern as Route Handlers in use-case-factories.ts) because the UseCase
// class is not @injectable and container cannot auto-resolve it by class token.

import { revalidatePath } from 'next/cache'
import { ensureContainer } from '@/lib/infrastructure/container'
import { createAddAllowedUserUseCase } from '@/app/api/_shared/use-case-factories'
import { getAuthenticatedSession } from './_shared/auth-helper'

export type AddAllowedUserActionResult =
  | { readonly success: true }
  | { readonly error: string }

export async function addAllowedUserAction(
  email: string,
): Promise<AddAllowedUserActionResult> {
  await ensureContainer()

  const session = await getAuthenticatedSession()
  if (!session) return { error: 'Unauthorized' }
  // M-1 fix: admin-only action — a valid non-admin session must be rejected.
  if (session.role !== 'admin') return { error: 'Forbidden' }

  const useCase = await createAddAllowedUserUseCase()
  const result = await useCase.execute({ email, addedBy: session.userId })
  if (!result.ok) return { error: result.error.message }

  revalidatePath('/admin/allow-list')
  return { success: true }
}
