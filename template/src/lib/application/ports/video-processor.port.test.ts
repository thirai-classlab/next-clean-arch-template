import { describe, it, expectTypeOf } from 'vitest'
import type { VideoProcessorPort } from './video-processor.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('VideoProcessorPort (type-level)', () => {
  it('generateThumbnail: (input) => Promise<Result<{thumbnailKey}, ExternalServiceError>>', () => {
    expectTypeOf<VideoProcessorPort['generateThumbnail']>().toEqualTypeOf<
      (input: {
        sourceKey: string
        atSec: number
      }) => Promise<Result<{ thumbnailKey: string }, ExternalServiceError>>
    >()
  })

  it('generateChapters: (input) => Promise<Result<ReadonlyArray<chapter>, ExternalServiceError>>', () => {
    expectTypeOf<VideoProcessorPort['generateChapters']>().toEqualTypeOf<
      (input: { sourceKey: string }) => Promise<
        Result<
          ReadonlyArray<{ startSec: number; endSec: number; title: string }>,
          ExternalServiceError
        >
      >
    >()
  })
})
