import { describe, it, expect, vi } from 'vitest'
import { RemoveAllowedUserUseCase } from './remove-allowed-user.use-case'
import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import { ok, err } from '../result'
import { NotFoundError, ValidationError } from '@/lib/domain/errors'
import { createEmail } from '@/lib/domain/value-objects/email'

const makeEmail = (s: string) => {
  const r = createEmail(s)
  if (!r.ok) throw new Error('bad email in test')
  return r.value
}

const mockAllowedUser = {
  id: 'au-1',
  email: makeEmail('user@example.com'),
  addedBy: 'admin-1',
  addedAt: new Date('2024-01-01'),
}

describe('RemoveAllowedUserUseCase', () => {
  it('returns ok(undefined) and emits audit log on successful removal', async () => {
    const findByEmail = vi.fn().mockResolvedValue(ok(mockAllowedUser))
    const deleteUser = vi.fn().mockResolvedValue(ok(undefined))
    const auditSave = vi.fn().mockResolvedValue(ok({ id: 'a1' }))

    const allowedUserRepo = {
      findByEmail,
      delete: deleteUser,
      findAll: vi.fn(),
      save: vi.fn(),
    } as unknown as AllowedUserRepository
    const auditLogRepo = {
      save: auditSave,
      findByActorId: vi.fn(),
      findSince: vi.fn(),
      deleteOlderThan: vi.fn(),
    } as unknown as AuditLogRepository

    const uc = new RemoveAllowedUserUseCase(allowedUserRepo, auditLogRepo)
    const result = await uc.execute({ email: 'user@example.com', removedBy: 'admin-1' })

    expect(result.ok).toBe(true)
    expect(deleteUser).toHaveBeenCalledWith('au-1')
    expect(auditSave).toHaveBeenCalledOnce()
    const auditArg = auditSave.mock.calls[0][0]
    expect(auditArg.action).toBe('allowed_user.removed')
    expect(auditArg.actorId).toBe('admin-1')
    expect(auditArg.targetId).toBe('au-1')
  })

  it('returns err(ValidationError) for invalid email', async () => {
    const allowedUserRepo = {} as AllowedUserRepository
    const auditLogRepo = {} as AuditLogRepository
    const uc = new RemoveAllowedUserUseCase(allowedUserRepo, auditLogRepo)
    const result = await uc.execute({ email: 'not-an-email', removedBy: 'admin-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('returns err(NotFoundError) when email not in allow-list', async () => {
    const findByEmail = vi.fn().mockResolvedValue(err(new NotFoundError('AllowedUser', 'missing@example.com')))
    const allowedUserRepo = { findByEmail, delete: vi.fn(), findAll: vi.fn(), save: vi.fn() } as unknown as AllowedUserRepository
    const auditLogRepo = { save: vi.fn(), findByActorId: vi.fn(), findSince: vi.fn(), deleteOlderThan: vi.fn() } as unknown as AuditLogRepository

    const uc = new RemoveAllowedUserUseCase(allowedUserRepo, auditLogRepo)
    const result = await uc.execute({ email: 'missing@example.com', removedBy: 'admin-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })
})
