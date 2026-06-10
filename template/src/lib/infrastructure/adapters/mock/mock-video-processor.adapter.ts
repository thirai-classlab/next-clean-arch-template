// src/lib/infrastructure/adapters/mock/mock-video-processor.adapter.ts
// Deterministic thumbnail / chapter generation.

import { injectable } from 'tsyringe'
import type { VideoProcessorPort } from '../../../application/ports/video-processor.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

@injectable()
export class MockVideoProcessorAdapter implements VideoProcessorPort {
  async generateThumbnail(input: {
    sourceKey: string
    atSec: number
  }): Promise<Result<{ thumbnailKey: string }, ExternalServiceError>> {
    return ok({ thumbnailKey: `${input.sourceKey}.thumb.${input.atSec}.jpg` })
  }

  async generateChapters(input: {
    sourceKey: string
  }): Promise<
    Result<
      ReadonlyArray<{ startSec: number; endSec: number; title: string }>,
      ExternalServiceError
    >
  > {
    return ok([
      { startSec: 0, endSec: 30, title: `Intro of ${input.sourceKey}` },
      { startSec: 30, endSec: 120, title: 'Main' },
    ])
  }
}
