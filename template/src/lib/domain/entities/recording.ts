// src/lib/domain/entities/recording.ts
// Recording entity — output of a finished Bot session.
// signedUrl/signedUrlExpiresAt are null until the recording has been processed.

export interface Recording {
  readonly id: string
  readonly botId: string
  readonly durationSecs: number
  readonly signedUrl: string | null
  readonly signedUrlExpiresAt: Date | null
  readonly createdAt: Date
}
