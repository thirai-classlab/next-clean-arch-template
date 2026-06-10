// src/lib/infrastructure/repositories/in-memory/in-memory-audit-log.repository.ts
// In-memory AuditLogRepository — draft 06 §3 minimal Profile persistence.
// `findByActorId(actorId, sinceDate)` returns logs whose createdAt >= sinceDate.
// `deleteOlderThan(date)` prunes entries whose createdAt < date, returning the
// number of rows removed (retention sweep semantics, per IF contract).
//
// globalThis-backed store (task-35 Step 2d):
//   Next.js 14 App Router gives Server Actions and Server Components separate
//   Node.js module cache entries.  Using `globalThis.__recall_poc_auditLogStore__`
//   makes the Map live on the process-global object, shared across module
//   contexts in the same Node.js process (Prisma dev singleton pattern).
//   This allows audit entries written by a Server Action to be read by a
//   Server Component in the same process, resolving the cross-context visibility
//   gap noted in full-flow.spec.ts test 1d.
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { AuditLogRepository } from '@/lib/application/repositories'
import { ok, type Result } from '@/lib/application/result'
import type { AuditLog } from '@/lib/domain/entities'
import type { ExternalServiceError } from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

/** Process-global backing store — survives Next.js module isolation. */
const GLOBAL_KEY = '__recall_poc_auditLogStore__'
declare global {
  // eslint-disable-next-line no-var
  var __recall_poc_auditLogStore__: Map<string, AuditLog> | undefined
}

function getGlobalStore(): Map<string, AuditLog> {
  // M-2 production fail-fast guard: in-memory stores are forbidden in production
  // to prevent accidental cross-tenant data exposure when this template is deployed.
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_MODE !== 'true') {
    throw new Error(
      '[SEC] InMemoryAuditLogRepository is forbidden in production. ' +
        'Set MOCK_MODE=true or replace with a persistent repository implementation.',
    )
  }
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Map<string, AuditLog>()
  }
  return globalThis[GLOBAL_KEY] as Map<string, AuditLog>
}

@injectable()
export class InMemoryAuditLogRepository
  extends InMemoryRepositoryBase<AuditLog>
  implements AuditLogRepository
{
  /** Override the base-class store with the process-global Map. */
  protected override readonly store: Map<string, AuditLog> = getGlobalStore()

  /**
   * Reset the process-global store (for test isolation).
   * Call this in beforeEach when the global store must start empty.
   */
  static resetStore(): void {
    globalThis[GLOBAL_KEY] = new Map<string, AuditLog>()
  }
  async findByActorId(
    actorId: string,
    sinceDate: Date,
  ): Promise<ReadonlyArray<AuditLog>> {
    const sinceMs = sinceDate.getTime()
    return Object.freeze(
      Array.from(this.store.values()).filter(
        (l) => l.actorId === actorId && l.createdAt.getTime() >= sinceMs,
      ),
    )
  }

  async findSince(sinceDate: Date): Promise<ReadonlyArray<AuditLog>> {
    const sinceMs = sinceDate.getTime()
    return Object.freeze(
      Array.from(this.store.values()).filter(
        (l) => l.createdAt.getTime() >= sinceMs,
      ),
    )
  }

  async save(log: AuditLog): Promise<Result<AuditLog, ExternalServiceError>> {
    return ok(this.putById(log))
  }

  async deleteOlderThan(
    date: Date,
  ): Promise<Result<number, ExternalServiceError>> {
    const cutoffMs = date.getTime()
    let deleted = 0
    for (const [id, log] of this.store.entries()) {
      if (log.createdAt.getTime() < cutoffMs) {
        this.store.delete(id)
        deleted++
      }
    }
    return ok(deleted)
  }
}
