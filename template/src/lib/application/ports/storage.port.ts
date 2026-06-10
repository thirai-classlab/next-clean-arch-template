// src/lib/application/ports/storage.port.ts
// StoragePort — abstracts blob storage (S3 / Supabase Storage) and signed URLs.

import type { Result } from '../result'
import type { ExternalServiceError, NotFoundError } from '../../domain/errors'

export interface StoragePort {
  upload(
    bucket: string,
    key: string,
    data: Uint8Array,
  ): Promise<Result<{ key: string }, ExternalServiceError>>
  getSignedUrl(
    bucket: string,
    key: string,
    expiresInSec: number,
  ): Promise<Result<{ url: string; expiresAt: Date }, NotFoundError | ExternalServiceError>>
  delete(
    bucket: string,
    key: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>>
}
