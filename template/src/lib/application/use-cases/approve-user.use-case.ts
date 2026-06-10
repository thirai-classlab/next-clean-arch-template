// src/lib/application/use-cases/approve-user.use-case.ts
// Draft 06 §1.4 Auth#7 — admin approves a pending User; emits AuditLog.

import type { UserRepository } from '../repositories/user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { User } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface ApproveUserInput {
  readonly userId: string
  readonly adminId: string
}

export class ApproveUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async execute(input: ApproveUserInput): Promise<Result<User, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
