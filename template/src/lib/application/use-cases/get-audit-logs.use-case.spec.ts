import { describe, it, expect, vi } from 'vitest'
import { GetAuditLogsUseCase } from './get-audit-logs.use-case'
import type { AuditLogRepository } from '../repositories/audit-log.repository'
import type { AuditLog } from '@/lib/domain/entities'

const makeLog = (id: string): AuditLog => ({
  id,
  actorId: 'admin-1',
  action: 'user.role_changed',
  targetId: 'user-1',
  targetType: 'User',
  metadata: {},
  createdAt: new Date('2024-06-01'),
})

describe('GetAuditLogsUseCase', () => {
  it('calls findSince when no actorId provided and returns ok(logs)', async () => {
    const logs = [makeLog('log-1'), makeLog('log-2')]
    const findSince = vi.fn().mockResolvedValue(logs)
    const auditLogRepo = { findSince, findByActorId: vi.fn(), save: vi.fn(), deleteOlderThan: vi.fn() } as unknown as AuditLogRepository

    const uc = new GetAuditLogsUseCase(auditLogRepo)
    const sinceDate = new Date('2024-01-01')
    const result = await uc.execute({ sinceDate })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(2)
    }
    expect(findSince).toHaveBeenCalledWith(sinceDate)
  })

  it('calls findByActorId when actorId is provided', async () => {
    const logs = [makeLog('log-1')]
    const findByActorId = vi.fn().mockResolvedValue(logs)
    const auditLogRepo = { findByActorId, findSince: vi.fn(), save: vi.fn(), deleteOlderThan: vi.fn() } as unknown as AuditLogRepository

    const uc = new GetAuditLogsUseCase(auditLogRepo)
    const sinceDate = new Date('2024-01-01')
    const result = await uc.execute({ sinceDate, actorId: 'admin-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
    }
    expect(findByActorId).toHaveBeenCalledWith('admin-1', sinceDate)
  })
})
