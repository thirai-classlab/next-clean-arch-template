// src/lib/application/ports/db.port.ts
// DbPort — abstracts DB transaction lifecycle so UseCases can compose
// repository writes atomically. Concrete adapters wrap pg / Supabase pool.

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export interface DbPort {
  withTransaction<T>(
    fn: () => Promise<Result<T, ExternalServiceError>>,
  ): Promise<Result<T, ExternalServiceError>>
}
