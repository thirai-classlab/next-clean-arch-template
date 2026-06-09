// src/app/(admin)/admin/_lib/audit-action-wrapper.ts
// task-5 Step 5 (draft 08 §3 REFACTOR / Phase 5 Step 5.2) — audit-on-mutation.
//
// 20 Server Action の audit log 記録を 1 箇所に集約する (draft 08 §3 REFACTOR
// 「20 Server Action の audit log 記録を `_lib/audit-action-wrapper.ts` で共通化」)。
//
// 設計方針:
//   - 既存の thin Server Action 群 (lib/interfaces/actions/*) は
//     `{ success: true } | { error: string }` の discriminated union を返す。
//   - 本 wrapper は「アクション本体を実行 → 成功時のみ audit_log に 1 件記録」する
//     高階関数 (HOF)。記録失敗が本来のアクション結果を壊さない (best-effort) よう、
//     recorder は内部で例外を握り潰し、logger に warn を残すだけにする。
//   - 実 DB 書込 (Supabase `log_audit_event` RPC) は Supabase env 確定後 (Step 3+) に
//     wired される。現段階では AuditLogRepository.save() 経由で記録する
//     (in-memory / 未配線時は recorder が graceful に no-op になる)。

import { logger } from '@/lib/infrastructure/logger'
import type { AuditLogRepository } from '@/lib/application/repositories/audit-log.repository'
import type { AuditLog } from '@/lib/domain/entities'

/**
 * Standard Server Action result shape used across the admin panel.
 * Mirrors the existing `lib/interfaces/actions/*.action.ts` contract.
 */
export type ActionResult =
  | { readonly success: true }
  | { readonly error: string }

/** Describes the audit entry a mutation should emit on success. */
export interface AuditDescriptor {
  /** Stable action verb, e.g. 'user.role_change' / 'allow_list.add'. */
  readonly action: string
  /** Logical target type, e.g. 'user' / 'allowed_user'. */
  readonly targetType: string
  /** Target id (the entity the mutation affected); null for fan-out actions. */
  readonly targetId: string | null
  /** Arbitrary structured context recorded in the audit payload. */
  readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * Resolve the actor id for the audit entry. Returned by the wrapper's caller
 * (the Server Action knows the current admin session). Kept as a thunk so the
 * actor is only resolved when the action itself succeeds.
 */
export type ActorResolver = () => Promise<string | null> | (string | null)

/**
 * Pure helper: should an audit entry be written for this result?
 * Only successful mutations are audited (failures are not state changes).
 * Extracted for unit testing without the container / logger.
 */
export function shouldAudit(result: ActionResult): boolean {
  return 'success' in result && result.success === true
}

/**
 * Build the AuditLog entity payload from the descriptor + resolved actor.
 * Pure (no I/O) so the shape is unit-testable. `id` / `createdAt` are filled by
 * the persistence layer when this lands on Supabase; here we stamp client-side
 * defaults so the in-memory repo path also works.
 */
export function buildAuditEntry(
  actorId: string,
  descriptor: AuditDescriptor,
  now: Date = new Date(),
): AuditLog {
  return {
    id: `audit_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    actorId,
    action: descriptor.action,
    targetId: descriptor.targetId,
    targetType: descriptor.targetType,
    metadata: descriptor.metadata ?? {},
    createdAt: now,
  }
}

/**
 * Best-effort recorder. Resolves AuditLogRepository from the container and
 * saves the entry. Any failure (env unset, port not wired, network) is swallowed
 * with a warn log so the audit write never corrupts the originating mutation.
 *
 * NOTE: When Supabase lands (Step 3+), swap the repository save for a
 * `supabase.rpc('log_audit_event', ...)` call (draft 08 §3.3 M-05 / §7.10).
 * The wrapper contract (audit-on-success) stays identical.
 */
export async function recordAuditEvent(
  actorId: string,
  descriptor: AuditDescriptor,
): Promise<void> {
  try {
    // Lazy-load container to avoid pulling the full DI module (with variable-path
    // dynamic imports) into the action-browser bundle at static analysis time.
    // Next.js action bundler (webpack) cannot process variable-path dynamic imports
    // in statically imported modules, causing __webpack_modules__[moduleId] errors.
    const { container, ensureContainer } = await import('@/lib/infrastructure/container')
    // Bootstrap the DI container (idempotent) before resolving any token.
    // Without this, container.resolve() throws "Attempted to resolve unregistered
    // dependency token" in MOCK_MODE because registerMockRepositories() has not run.
    await ensureContainer()
    const repo = container.resolve<AuditLogRepository>('AuditLogRepository')
    const entry = buildAuditEntry(actorId, descriptor)
    const result = await repo.save(entry)
    if (!result.ok) {
      logger.warn(
        { action: descriptor.action, reason: result.error.message },
        '[audit] audit_log write failed (non-fatal)',
      )
    }
  } catch (error: unknown) {
    // Container token unregistered (pre-Step-3) / Supabase env unset / network.
    const reason = error instanceof Error ? error.message : String(error)
    logger.warn(
      { action: descriptor.action, reason },
      '[audit] audit_log recorder unavailable (env-deferred, non-fatal)',
    )
  }
}

/**
 * Wrap a Server Action so that a successful mutation also writes an audit_log
 * entry. Returns a new action with the same signature.
 *
 * Usage (Server Action):
 *   export const changeUserRoleAction = withAudit(
 *     rawChangeUserRole,
 *     (args, _result) => ({
 *       action: 'user.role_change',
 *       targetType: 'user',
 *       targetId: args[0],            // userId
 *       metadata: { newRole: args[1] },
 *     }),
 *     getCurrentAdminId,              // ActorResolver
 *   )
 *
 * The descriptor builder receives the action args + result so the audit entry
 * can reference the affected entity. Audit recording is awaited (so the entry is
 * durable before the action returns) but failures are non-fatal.
 */
export function withAudit<Args extends readonly unknown[]>(
  action: (...args: Args) => Promise<ActionResult>,
  describe: (args: Args, result: Extract<ActionResult, { success: true }>) => AuditDescriptor,
  resolveActor: ActorResolver,
): (...args: Args) => Promise<ActionResult> {
  return async (...args: Args): Promise<ActionResult> => {
    const result = await action(...args)
    if (!shouldAudit(result)) {
      return result
    }
    const actorId = await resolveActor()
    if (actorId) {
      await recordAuditEvent(
        actorId,
        describe(args, result as Extract<ActionResult, { success: true }>),
      )
    } else {
      logger.warn(
        '[audit] actor unresolved; skipping audit entry for successful mutation',
      )
    }
    return result
  }
}
