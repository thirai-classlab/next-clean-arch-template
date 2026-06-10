// src/lib/infrastructure/adapters/mock/mock-media-server.adapter.ts
// In-memory LiveKit-style room registry.

import { injectable } from 'tsyringe'
import type { MediaServerPort } from '../../../application/ports/media-server.port'
import { ok, err, type Result } from '../../../application/result'
import {
  NotFoundError,
  type ExternalServiceError,
} from '../../../domain/errors'

@injectable()
export class MockMediaServerAdapter implements MediaServerPort {
  private rooms = new Map<string, { name: string }>()
  private counter = 0

  async createRoom(input: {
    name: string
  }): Promise<Result<{ roomId: string; joinUrl: string }, ExternalServiceError>> {
    const roomId = `mock-room-${++this.counter}`
    this.rooms.set(roomId, { name: input.name })
    return ok({
      roomId,
      joinUrl: `https://mock-media-server/rooms/${roomId}`,
    })
  }

  async closeRoom(
    roomId: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>> {
    if (!this.rooms.delete(roomId)) return err(new NotFoundError('room', roomId))
    return ok(undefined as void)
  }
}
