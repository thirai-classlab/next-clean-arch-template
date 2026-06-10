// src/lib/application/repositories/audit-log.repository.ts
// AuditLogRepository — persistence boundary for AuditLog entities (draft 06 §1.4).
// `deleteOlderThan` returns the number of rows pruned (retention sweep).

import type { AuditLog } from '@/lib/domain/entities'
import type { ExternalServiceError } from '@/lib/domain/errors'
import type { Result } from '../result'

export interface AuditLogRepository {
  findByActorId(
    actorId: string,
    sinceDate: Date,
  ): Promise<ReadonlyArray<AuditLog>>
  findSince(sinceDate: Date): Promise<ReadonlyArray<AuditLog>>
  save(log: AuditLog): Promise<Result<AuditLog, ExternalServiceError>>
  deleteOlderThan(date: Date): Promise<Result<number, ExternalServiceError>>
}
