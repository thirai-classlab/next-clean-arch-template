// src/lib/application/use-cases/add-allowed-user.use-case.ts
// Draft 06 §1.4 Admin#4 — register an email as pre-approved user.

import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { AllowedUser } from '@/lib/domain/entities'
import { ok, err } from '../result'
import { ValidationError } from '@/lib/domain/errors'
import { createEmail } from '@/lib/domain/value-objects/email'

export interface AddAllowedUserInput {
  readonly email: string
  readonly addedBy: string
}

export class AddAllowedUserUseCase {
  constructor(
    private readonly allowedUserRepo: AllowedUserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async execute(
    input: AddAllowedUserInput,
  ): Promise<Result<AllowedUser, DomainError>> {
    const emailResult = createEmail(input.email)
    if (!emailResult.ok) {
      return err(new ValidationError(`invalid email: ${input.email}`))
    }

    const allowedUser: AllowedUser = {
      id: `allowed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: emailResult.value,
      addedBy: input.addedBy,
      addedAt: new Date(),
    }

    const saveResult = await this.allowedUserRepo.save(allowedUser)
    if (!saveResult.ok) {
      return err(saveResult.error)
    }

    // intentionally fire-and-forget (POC): audit log persistence failures are
    // non-critical — the primary operation (allow-list save) has already
    // succeeded. In a production system, consider queuing or logging the failure.
    await this.auditLogRepo.save({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      actorId: input.addedBy,
      action: 'allowed_user.added',
      targetId: allowedUser.id,
      targetType: 'AllowedUser',
      metadata: { email: input.email },
      createdAt: new Date(),
    })

    return ok(saveResult.value)
  }
}
