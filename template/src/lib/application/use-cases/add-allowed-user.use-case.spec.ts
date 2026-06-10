import { describe, it, expect, vi } from 'vitest'
import { AddAllowedUserUseCase } from './add-allowed-user.use-case'
import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import { ConflictError } from '@/lib/domain/errors'
import { ok, err } from '../result'
import type { AllowedUser } from '@/lib/domain/entities'
import { createEmail } from '@/lib/domain/value-objects/email'

function makeRepos() {
  const savedAllowedUser = vi.fn()
  const allowedUserRepo: AllowedUserRepository = {
    findByEmail: vi.fn(),
    findAll: vi.fn(),
    save: savedAllowedUser,
    delete: vi.fn(),
  }
  const savedAuditLog = vi.fn()
  const auditLogRepo: AuditLogRepository = {
    findByActorId: vi.fn(),
    findSince: vi.fn(),
    save: savedAuditLog,
    deleteOlderThan: vi.fn(),
  }
  return { allowedUserRepo, auditLogRepo, savedAllowedUser, savedAuditLog }
}

describe('AddAllowedUserUseCase', () => {
  it('returns Result.err(ValidationError) when email is invalid', async () => {
    const { allowedUserRepo, auditLogRepo } = makeRepos()
    const uc = new AddAllowedUserUseCase(allowedUserRepo, auditLogRepo)
    const r = await uc.execute({ email: 'not-an-email', addedBy: 'admin1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.message).toContain('invalid email')
    }
  })

  it('saves AllowedUser and AuditLog on success, returns ok(allowedUser)', async () => {
    // Arrange
    const { allowedUserRepo, auditLogRepo, savedAllowedUser, savedAuditLog } =
      makeRepos()
    const emailResult = createEmail('new@example.com')
    expect(emailResult.ok).toBe(true)
    const fakeAllowedUser: AllowedUser = {
      id: 'au-1',
      email: emailResult.ok ? emailResult.value : ({} as never),
      addedBy: 'admin-1',
      addedAt: new Date(),
    }
    savedAllowedUser.mockResolvedValue(ok(fakeAllowedUser))
    savedAuditLog.mockResolvedValue(
      ok({
        id: 'log-1',
        actorId: 'admin-1',
        action: 'allowed_user.added',
        targetId: 'au-1',
        targetType: 'AllowedUser',
        metadata: {},
        createdAt: new Date(),
      }),
    )

    const uc = new AddAllowedUserUseCase(allowedUserRepo, auditLogRepo)

    // Act
    const r = await uc.execute({ email: 'new@example.com', addedBy: 'admin-1' })

    // Assert
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toBe(fakeAllowedUser)
    }
    expect(savedAllowedUser).toHaveBeenCalledOnce()
    expect(savedAuditLog).toHaveBeenCalledOnce()
    const [logArg] = savedAuditLog.mock.calls[0] as [
      Parameters<AuditLogRepository['save']>[0],
    ]
    expect(logArg.action).toBe('allowed_user.added')
    expect(logArg.actorId).toBe('admin-1')
  })

  it('returns Result.err(ConflictError) and skips audit log when save fails', async () => {
    // Arrange
    const { allowedUserRepo, auditLogRepo, savedAllowedUser, savedAuditLog } =
      makeRepos()
    savedAllowedUser.mockResolvedValue(
      err(new ConflictError('allowed user with email new@example.com already exists')),
    )

    const uc = new AddAllowedUserUseCase(allowedUserRepo, auditLogRepo)

    // Act
    const r = await uc.execute({ email: 'new@example.com', addedBy: 'admin-1' })

    // Assert
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ConflictError)
    }
    expect(savedAuditLog).not.toHaveBeenCalled()
  })
})
