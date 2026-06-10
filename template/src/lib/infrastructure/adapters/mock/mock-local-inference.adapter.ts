// src/lib/infrastructure/adapters/mock/mock-local-inference.adapter.ts
// Echoes the prompt with a deterministic suffix; honours maxTokens.

import { injectable } from 'tsyringe'
import type { LocalInferencePort } from '../../../application/ports/local-inference.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

@injectable()
export class MockLocalInferenceAdapter implements LocalInferencePort {
  async generate(input: {
    prompt: string
    model: string
    maxTokens?: number
  }): Promise<Result<{ text: string; tokensUsed: number }, ExternalServiceError>> {
    const reply = `${input.prompt} [mock:${input.model}]`
    const tokens = Math.min(reply.split(/\s+/).length, input.maxTokens ?? 1024)
    return ok({ text: reply, tokensUsed: tokens })
  }
}
