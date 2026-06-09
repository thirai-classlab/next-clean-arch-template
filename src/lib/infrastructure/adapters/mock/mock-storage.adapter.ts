// src/lib/infrastructure/adapters/mock/mock-storage.adapter.ts
// In-memory blob storage keyed by `${bucket}/${key}`.

import { injectable } from 'tsyringe'
import type { StoragePort } from '../../../application/ports/storage.port'
import { ok, err, type Result } from '../../../application/result'
import {
  NotFoundError,
  type ExternalServiceError,
} from '../../../domain/errors'

@injectable()
export class MockStorageAdapter implements StoragePort {
  private blobs = new Map<string, Uint8Array>()

  private k(bucket: string, key: string): string {
    return `${bucket}/${key}`
  }

  async upload(
    bucket: string,
    key: string,
    data: Uint8Array,
  ): Promise<Result<{ key: string }, ExternalServiceError>> {
    this.blobs.set(this.k(bucket, key), data)
    return ok({ key })
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresInSec: number,
  ): Promise<
    Result<{ url: string; expiresAt: Date }, NotFoundError | ExternalServiceError>
  > {
    if (!this.blobs.has(this.k(bucket, key))) {
      return err(new NotFoundError('blob', this.k(bucket, key)))
    }
    return ok({
      url: `https://mock-signed-url/${bucket}/${key}`,
      expiresAt: new Date(Date.now() + expiresInSec * 1000),
    })
  }

  async delete(
    bucket: string,
    key: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>> {
    if (!this.blobs.delete(this.k(bucket, key))) {
      return err(new NotFoundError('blob', this.k(bucket, key)))
    }
    return ok(undefined as void)
  }
}
