import { describe, it, expect } from 'vitest'
import { ApproveUserUseCase } from './approve-user.use-case'
import type { UserRepository } from '../repositories/user.repository'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('ApproveUserUseCase (signature)', () => {
  const userRepo = {} as UserRepository
  const auditLogRepo = {} as AuditLogRepository

  it('is constructible with UserRepository + AuditLogRepository', () => {
    const uc = new ApproveUserUseCase(userRepo, auditLogRepo)
    expect(uc).toBeInstanceOf(ApproveUserUseCase)
  })

  it('exposes execute()', () => {
    const uc = new ApproveUserUseCase(userRepo, auditLogRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new ApproveUserUseCase(userRepo, auditLogRepo)
    const r = await uc.execute({ userId: 'u1', adminId: 'a1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
