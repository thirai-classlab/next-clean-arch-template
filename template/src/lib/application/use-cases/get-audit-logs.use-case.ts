// src/lib/application/use-cases/get-audit-logs.use-case.ts
// Draft 06 §1.4 Admin#3 — list audit logs (optionally filtered by actorId).

import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { AuditLog } from '@/lib/domain/entities'
import { ok } from '../result'

export interface GetAuditLogsInput {
  readonly sinceDate: Date
  readonly actorId?: string
}

export class GetAuditLogsUseCase {
  constructor(private readonly auditLogRepo: AuditLogRepository) {}

  async execute(
    input: GetAuditLogsInput,
  ): Promise<Result<ReadonlyArray<AuditLog>, DomainError>> {
    const logs = input.actorId
      ? await this.auditLogRepo.findByActorId(input.actorId, input.sinceDate)
      : await this.auditLogRepo.findSince(input.sinceDate)
    return ok(logs)
  }
}
