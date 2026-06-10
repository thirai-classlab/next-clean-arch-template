// src/lib/application/use-cases/get-transcripts.use-case.ts
// Draft 06 §1.4 Transcript#1 — list transcripts for a given Bot.

import type { TranscriptRepository } from '../repositories/transcript.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Transcript } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface GetTranscriptsInput {
  readonly botId: string
}

export class GetTranscriptsUseCase {
  constructor(private readonly transcriptRepo: TranscriptRepository) {}

  async execute(
    input: GetTranscriptsInput,
  ): Promise<Result<ReadonlyArray<Transcript>, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
