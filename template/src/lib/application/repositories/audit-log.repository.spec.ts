// src/lib/application/repositories/audit-log.repository.spec.ts
// Type-level test for AuditLogRepository interface shape (draft 06 §1.4 L509-514).

import { describe, it, expectTypeOf } from 'vitest'
import type { AuditLogRepository } from './audit-log.repository'
import type { AuditLog } from '@/lib/domain/entities'
import type { Result } from '../result'
import type { ExternalServiceError } from '@/lib/domain/errors'

describe('AuditLogRepository (interface shape)', () => {
  it('exposes findByActorId(actorId, sinceDate) -> Promise<ReadonlyArray<AuditLog>>', () => {
    expectTypeOf<AuditLogRepository['findByActorId']>().toEqualTypeOf<
      (actorId: string, sinceDate: Date) => Promise<ReadonlyArray<AuditLog>>
    >()
  })

  it('exposes save(log) -> Promise<Result<AuditLog, ExternalServiceError>>', () => {
    expectTypeOf<AuditLogRepository['save']>().toEqualTypeOf<
      (log: AuditLog) => Promise<Result<AuditLog, ExternalServiceError>>
    >()
  })

  it('exposes findSince(sinceDate) -> Promise<ReadonlyArray<AuditLog>>', () => {
    expectTypeOf<AuditLogRepository['findSince']>().toEqualTypeOf<
      (sinceDate: Date) => Promise<ReadonlyArray<AuditLog>>
    >()
  })

  it('exposes deleteOlderThan(date) -> Promise<Result<number, ExternalServiceError>>', () => {
    expectTypeOf<AuditLogRepository['deleteOlderThan']>().toEqualTypeOf<
      (date: Date) => Promise<Result<number, ExternalServiceError>>
    >()
  })
})
