// src/lib/domain/entities/audit-log.ts
// AuditLog entity — record of an action performed by an actor.
// targetId/targetType are null for system actions with no concrete target.

export interface AuditLog {
  readonly id: string
  readonly actorId: string
  readonly action: string
  readonly targetId: string | null
  readonly targetType: string | null
  readonly metadata: Readonly<Record<string, unknown>>
  readonly createdAt: Date
}
