// src/lib/application/ports/media-server.port.ts
// MediaServerPort — abstracts live media stream distribution (LiveKit / mock).

import type { Result } from '../result'
import type { ExternalServiceError, NotFoundError } from '../../domain/errors'

export interface MediaServerPort {
  createRoom(input: {
    name: string
  }): Promise<Result<{ roomId: string; joinUrl: string }, ExternalServiceError>>

  closeRoom(
    roomId: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>>
}
