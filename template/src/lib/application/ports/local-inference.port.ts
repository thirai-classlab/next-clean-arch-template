// src/lib/application/ports/local-inference.port.ts
// LocalInferencePort — abstracts on-device LLM inference (Ollama / mock).
// Used by Desktop SDK challenges (NEW-E2 fully-local LLM 等).

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export interface LocalInferencePort {
  generate(input: {
    prompt: string
    model: string
    maxTokens?: number
  }): Promise<Result<{ text: string; tokensUsed: number }, ExternalServiceError>>
}
