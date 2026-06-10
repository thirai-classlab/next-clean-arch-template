// src/lib/application/use-cases/change-user-role.use-case.ts
// Draft 06 §1.4 Admin#2 — admin changes another user's role; emits AuditLog.

import type { UserRepository } from '../repositories/user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { User } from '@/lib/domain/entities'
import type { Role } from '@/lib/domain/value-objects/role'
import { ok, err } from '../result'

export interface ChangeUserRoleInput {
  readonly userId: string
  readonly newRole: Role
  readonly adminId: string
}

export class ChangeUserRoleUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async execute(input: ChangeUserRoleInput): Promise<Result<User, DomainError>> {
    const findResult = await this.userRepo.findById(input.userId)
    if (!findResult.ok) {
      return err(findResult.error)
    }

    const previousRole = findResult.value.role
    const updatedUser: User = {
      ...findResult.value,
      role: input.newRole,
      updatedAt: new Date(),
    }

    const saveResult = await this.userRepo.save(updatedUser)
    if (!saveResult.ok) {
      return err(saveResult.error)
    }

    // intentionally fire-and-forget (POC): audit log persistence failures are
    // non-critical — the primary operation (role update) has already succeeded.
    // In a production system, consider queuing or logging the failure.
    await this.auditLogRepo.save({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      actorId: input.adminId,
      action: 'user.role_changed',
      targetId: input.userId,
      targetType: 'User',
      metadata: { previousRole, newRole: input.newRole },
      createdAt: new Date(),
    })

    return ok(saveResult.value)
  }
}
