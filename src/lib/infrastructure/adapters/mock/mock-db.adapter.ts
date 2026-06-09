// src/lib/infrastructure/adapters/mock/mock-db.adapter.ts
// In-memory DbPort: executes the callback synchronously, wraps exceptions.

import { injectable } from 'tsyringe'
import type { DbPort } from '../../../application/ports/db.port'
import { err, type Result } from '../../../application/result'
import { ExternalServiceError } from '../../../domain/errors'

@injectable()
export class MockDbAdapter implements DbPort {
  async withTransaction<T>(
    fn: () => Promise<Result<T, ExternalServiceError>>,
  ): Promise<Result<T, ExternalServiceError>> {
    try {
      return await fn()
    } catch (e: unknown) {
      return err(new ExternalServiceError('mock-db', e))
    }
  }
}
