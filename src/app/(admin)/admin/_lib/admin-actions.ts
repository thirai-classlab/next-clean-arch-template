'use server'
// src/app/(admin)/admin/_lib/admin-actions.ts
// task-5 Step 5 — admin Server Actions wired through the audit-action-wrapper.
//
// These compose the EXISTING thin Server Actions (lib/interfaces/actions/*) with
// withAudit() so every successful mutation also emits an audit_log entry
// (draft 08 §5.2 / §3 REFACTOR). The base actions already resolve the admin
// session + UseCase; here we add the audit cross-cut + the remaining actions
// (remove-allowed) that the admin panel needs.
//
// IMPLEMENTED end-to-end (base action exists + audited):
//   - changeUserRole   (user.role_change)
//   - addAllowList     (allow_list.add)
//   - approveUser      (user.approve)
//   - rejectUser       (user.reject)
//   - removeAllowList  (allow_list.remove)  [via RemoveAllowedUserUseCase]
//
// STUBBED (typed signature + TODO Step 5 cont. / Step 7):
//   - updateUserStatus (suspend/unsuspend), updateSettings, exportAuditLog, etc.

import {
  changeUserRoleAction,
  addAllowedUserAction,
  approveUserAction,
  rejectUserAction,
} from '@/lib/interfaces/actions'
import { getAuthenticatedSession } from '@/lib/interfaces/actions/_shared/auth-helper'
import { RemoveAllowedUserUseCase } from '@/lib/application/use-cases/remove-allowed-user.use-case'
import type { AllowedUserRepository } from '@/lib/application/repositories/allowed-user.repository'
import type { AuditLogRepository } from '@/lib/application/repositories/audit-log.repository'
import type { Role } from '@/lib/domain/value-objects/role'
import { withAudit, type ActionResult } from './audit-action-wrapper'

// String tokens for container.resolve() — must match REPO_TOKEN_CLASS_MAP keys in container.ts.
const REPO_TOKENS = {
  AllowedUserRepository: 'AllowedUserRepository',
  AuditLogRepository: 'AuditLogRepository',
} as const

/** ActorResolver: the current admin's id (used as audit `actor_id`). */
async function currentAdminId(): Promise<string | null> {
  const session = await getAuthenticatedSession()
  return session?.userId ?? null
}

// ── Implemented + audited ───────────────────────────────────────────────────

/** Change a user's role. Audits `user.role_change`. */
export const changeUserRole = withAudit(
  (userId: string, newRole: Role): Promise<ActionResult> =>
    changeUserRoleAction(userId, newRole),
  ([userId, newRole]) => ({
    action: 'user.role_change',
    targetType: 'user',
    targetId: userId,
    metadata: { newRole },
  }),
  currentAdminId,
)

/** Add an email/domain to the allow list. Audits `allow_list.add`. */
export const addAllowList = withAudit(
  (email: string): Promise<ActionResult> => addAllowedUserAction(email),
  ([email]) => ({
    action: 'allow_list.add',
    targetType: 'allowed_user',
    targetId: null,
    metadata: { email },
  }),
  currentAdminId,
)

/** Approve a pending user. Audits `user.approve`. */
export const approveUser = withAudit(
  (userId: string): Promise<ActionResult> => approveUserAction(userId),
  ([userId]) => ({
    action: 'user.approve',
    targetType: 'user',
    targetId: userId,
  }),
  currentAdminId,
)

/** Reject a pending user. Audits `user.reject`. */
export const rejectUser = withAudit(
  (userId: string, reason: string): Promise<ActionResult> =>
    rejectUserAction(userId, reason),
  ([userId, reason]) => ({
    action: 'user.reject',
    targetType: 'user',
    targetId: userId,
    metadata: { reason },
  }),
  currentAdminId,
)

/**
 * Remove an email from the allow list. Audits `allow_list.remove`.
 * Implemented directly here because there was no thin base action yet
 * (RemoveAllowedUserUseCase already exists in the Application layer).
 */
async function rawRemoveAllowList(email: string): Promise<ActionResult> {
  const session = await getAuthenticatedSession()
  if (!session) return { error: 'Unauthorized' }
  // M-1 fix: admin-only action — a valid non-admin session must be rejected.
  if (session.role !== 'admin') return { error: 'Forbidden' }

  const { container, ensureContainer } = await import('@/lib/infrastructure/container')
  await ensureContainer()
  const useCase = new RemoveAllowedUserUseCase(
    container.resolve<AllowedUserRepository>(REPO_TOKENS.AllowedUserRepository),
    container.resolve<AuditLogRepository>(REPO_TOKENS.AuditLogRepository),
  )
  const result = await useCase.execute({ email, removedBy: session.userId })
  if (!result.ok) return { error: result.error.message }
  return { success: true }
}

export const removeAllowList = withAudit(
  rawRemoveAllowList,
  ([email]) => ({
    action: 'allow_list.remove',
    targetType: 'allowed_user',
    targetId: null,
    metadata: { email },
  }),
  currentAdminId,
)

// ── Stubbed (typed signatures; full impl in Step 5 cont. / Step 7) ───────────

/**
 * Suspend / unsuspend a user.
 * TODO Step 5 cont.: add SuspendUserUseCase + thin base action, then wrap
 * with withAudit (action: 'user.status_change').
 */
export async function updateUserStatus(
  _userId: string,
  _status: 'active' | 'suspended',
): Promise<ActionResult> {
  return { error: 'not implemented: Step 5 cont. (updateUserStatus)' }
}

/**
 * Update organization settings.
 * TODO Step 5 cont.: add UpdateOrganizationSettingsUseCase + organization_settings
 * migration (draft 08 L-03), then wrap (action: 'settings.update').
 */
export async function updateSettings(
  _settings: Record<string, unknown>,
): Promise<ActionResult> {
  return { error: 'not implemented: Step 5 cont. (updateSettings)' }
}

/**
 * Export audit logs as CSV (returns a CSV string when implemented).
 * TODO Step 7: stream audit_log SELECT → CSV (draft 08 §5.4 / §7.11).
 */
export async function exportAuditLog(): Promise<
  { readonly success: true; readonly csv: string } | { readonly error: string }
> {
  return { error: 'not implemented: Step 7 (exportAuditLog)' }
}
