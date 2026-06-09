import { describe, it, expect } from 'vitest'
import type { WebhookEvent } from './webhook-event'

describe('WebhookEvent entity', () => {
  it('構造一致: eventType / payload / processedAt / idempotencyKey を持つ', () => {
    const ev: WebhookEvent = {
      id: 'whk-1',
      eventType: 'bot.status_change',
      payload: { bot_id: 'bot-1', status: 'in_call_recording', code: 'ok' },
      processedAt: new Date('2026-01-01T00:00:00Z'),
      idempotencyKey: 'idem-abc-123',
    }

    expect(ev.id).toBe('whk-1')
    expect(ev.eventType).toBe('bot.status_change')
    expect(ev.payload.bot_id).toBe('bot-1')
    expect(ev.processedAt).toBeInstanceOf(Date)
    expect(ev.idempotencyKey).toBe('idem-abc-123')
  })

  it('processedAt は null 許容 (未処理 webhook)', () => {
    const ev: WebhookEvent = {
      id: 'whk-2',
      eventType: 'transcript.received',
      payload: {},
      processedAt: null,
      idempotencyKey: 'idem-xyz',
    }

    expect(ev.processedAt).toBeNull()
  })

  it('readonly: payload は Readonly<Record>、新 key 追加は型エラー', () => {
    const ev: WebhookEvent = {
      id: 'whk-3',
      eventType: 'recording.done',
      payload: { url: 'https://example.com/rec.mp4' },
      processedAt: null,
      idempotencyKey: 'idem-1',
    }

    // @ts-expect-error - payload is Readonly<Record>, assignment blocked
    ev.payload = { something: 'else' }
    expect(ev.payload.something).toBe('else')
  })
})
