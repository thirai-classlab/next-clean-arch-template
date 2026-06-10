// src/lib/application/use-cases/reject-user.use-case.ts
// Draft 06 §1.4 Auth#8 — admin rejects a pending User with reason; emits AuditLog.

import type { UserRepository } from '../repositories/user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface RejectUserInput {
  readonly userId: string
  readonly adminId: string
  readonly reason: string
}

export class RejectUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async execute(input: RejectUserInput): Promise<Result<void, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
