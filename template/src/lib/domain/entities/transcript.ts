// src/lib/domain/entities/transcript.ts
// Transcript entity — speech-to-text result for a Bot session.
// speakerId is null when speaker diarization failed or is unavailable.

export interface Transcript {
  readonly id: string
  readonly botId: string
  readonly speakerId: string | null
  readonly words: ReadonlyArray<{
    readonly word: string
    readonly startMs: number
    readonly endMs: number
  }>
  readonly confidence: number
  readonly createdAt: Date
}
