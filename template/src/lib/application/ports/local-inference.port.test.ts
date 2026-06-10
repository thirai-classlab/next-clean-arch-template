import { describe, it, expectTypeOf } from 'vitest'
import type { LocalInferencePort } from './local-inference.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('LocalInferencePort (type-level)', () => {
  it('generate: (input) => Promise<Result<{text,tokensUsed}, ExternalServiceError>>', () => {
    expectTypeOf<LocalInferencePort['generate']>().toEqualTypeOf<
      (input: {
        prompt: string
        model: string
        maxTokens?: number
      }) => Promise<Result<{ text: string; tokensUsed: number }, ExternalServiceError>>
    >()
  })
})
