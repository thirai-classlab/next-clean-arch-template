import { describe, it, expect } from 'vitest'
import type { Recording } from './recording'

describe('Recording entity', () => {
  it('構造一致: 処理済 recording は signedUrl + expiresAt を持つ', () => {
    const rec: Recording = {
      id: 'rec-1',
      botId: 'bot-1',
      durationSecs: 3600,
      signedUrl: 'https://s3.amazonaws.com/recall/rec-1.mp4?sig=xxx',
      signedUrlExpiresAt: new Date('2026-01-02T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }

    expect(rec.id).toBe('rec-1')
    expect(rec.botId).toBe('bot-1')
    expect(rec.durationSecs).toBe(3600)
    expect(rec.signedUrl).toContain('s3.amazonaws.com')
    expect(rec.signedUrlExpiresAt).toBeInstanceOf(Date)
    expect(rec.createdAt).toBeInstanceOf(Date)
  })

  it('未処理 recording は signedUrl / expiresAt が null 許容', () => {
    const rec: Recording = {
      id: 'rec-2',
      botId: 'bot-2',
      durationSecs: 0,
      signedUrl: null,
      signedUrlExpiresAt: null,
      createdAt: new Date(),
    }

    expect(rec.signedUrl).toBeNull()
    expect(rec.signedUrlExpiresAt).toBeNull()
  })

  it('readonly: durationSecs mutation は型エラー', () => {
    const rec: Recording = {
      id: 'rec-3',
      botId: 'bot-3',
      durationSecs: 100,
      signedUrl: null,
      signedUrlExpiresAt: null,
      createdAt: new Date(),
    }

    // @ts-expect-error - durationSecs is readonly
    rec.durationSecs = 200
    expect(rec.durationSecs).toBe(200)
  })
})
