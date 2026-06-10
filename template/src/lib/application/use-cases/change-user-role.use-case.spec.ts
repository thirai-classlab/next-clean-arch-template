import { describe, it, expect, vi } from 'vitest'
import { ChangeUserRoleUseCase } from './change-user-role.use-case'
import type { UserRepository } from '../repositories/user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import { ok, err } from '../result'
import { NotFoundError } from '@/lib/domain/errors'
import { createEmail } from '@/lib/domain/value-objects/email'

const makeEmail = (s: string) => {
  const r = createEmail(s)
  if (!r.ok) throw new Error('bad email in test')
  return r.value
}

const mockUser = {
  id: 'user-1',
  email: makeEmail('user@example.com'),
  role: 'member' as const,
  status: 'approved' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('ChangeUserRoleUseCase', () => {
  it('returns ok(User) with new role and emits audit log', async () => {
    const findById = vi.fn().mockResolvedValue(ok(mockUser))
    const save = vi.fn().mockResolvedValue(ok({ ...mockUser, role: 'admin' as const }))
    const auditSave = vi.fn().mockResolvedValue(ok({ id: 'a1' }))

    const userRepo = { findById, save, findAll: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), delete: vi.fn() } as unknown as UserRepository
    const auditLogRepo = { save: auditSave, findByActorId: vi.fn(), findSince: vi.fn(), deleteOlderThan: vi.fn() } as unknown as AuditLogRepository

    const uc = new ChangeUserRoleUseCase(userRepo, auditLogRepo)
    const result = await uc.execute({ userId: 'user-1', newRole: 'admin', adminId: 'admin-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.role).toBe('admin')
    }
    expect(auditSave).toHaveBeenCalledOnce()
    const auditArg = auditSave.mock.calls[0][0]
    expect(auditArg.action).toBe('user.role_changed')
    expect(auditArg.actorId).toBe('admin-1')
    expect(auditArg.metadata).toMatchObject({ previousRole: 'member', newRole: 'admin' })
  })

  it('returns err(NotFoundError) when user is not found', async () => {
    const findById = vi.fn().mockResolvedValue(err(new NotFoundError('User', 'missing-id')))
    const userRepo = { findById, save: vi.fn(), findAll: vi.fn(), findByEmail: vi.fn(), findPending: vi.fn(), delete: vi.fn() } as unknown as UserRepository
    const auditLogRepo = { save: vi.fn(), findByActorId: vi.fn(), findSince: vi.fn(), deleteOlderThan: vi.fn() } as unknown as AuditLogRepository

    const uc = new ChangeUserRoleUseCase(userRepo, auditLogRepo)
    const result = await uc.execute({ userId: 'missing-id', newRole: 'admin', adminId: 'admin-1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })
})
