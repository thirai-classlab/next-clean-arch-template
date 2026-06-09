// src/lib/application/use-cases/remove-allowed-user.use-case.ts
// Draft 06 §1.4 Admin#5 — revoke an email from the AllowedUser list; emits AuditLog.

import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { ok, err } from '../result'
import { ValidationError } from '@/lib/domain/errors'
import { createEmail } from '@/lib/domain/value-objects/email'

export interface RemoveAllowedUserInput {
  readonly email: string
  readonly removedBy: string
}

export class RemoveAllowedUserUseCase {
  constructor(
    private readonly allowedUserRepo: AllowedUserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async execute(
    input: RemoveAllowedUserInput,
  ): Promise<Result<void, DomainError>> {
    const emailResult = createEmail(input.email)
    if (!emailResult.ok) {
      return err(new ValidationError(`invalid email: ${input.email}`))
    }

    const findResult = await this.allowedUserRepo.findByEmail(emailResult.value)
    if (!findResult.ok) {
      return err(findResult.error)
    }

    const allowedUser = findResult.value
    const deleteResult = await this.allowedUserRepo.delete(allowedUser.id)
    if (!deleteResult.ok) {
      return err(deleteResult.error)
    }

    // intentionally fire-and-forget (POC): audit log persistence failures are
    // non-critical — the primary operation (delete) has already succeeded.
    // In a production system, consider queuing or logging the failure.
    await this.auditLogRepo.save({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      actorId: input.removedBy,
      action: 'allowed_user.removed',
      targetId: allowedUser.id,
      targetType: 'AllowedUser',
      metadata: { email: input.email },
      createdAt: new Date(),
    })

    return ok(undefined)
  }
}
