// src/lib/application/ports/video-processor.port.ts
// VideoProcessorPort — abstracts post-processing (ffmpeg / mock):
// thumbnails, chapterization, format transcoding.

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export interface VideoProcessorPort {
  generateThumbnail(input: {
    sourceKey: string
    atSec: number
  }): Promise<Result<{ thumbnailKey: string }, ExternalServiceError>>

  generateChapters(input: {
    sourceKey: string
  }): Promise<
    Result<
      ReadonlyArray<{ startSec: number; endSec: number; title: string }>,
      ExternalServiceError
    >
  >
}
