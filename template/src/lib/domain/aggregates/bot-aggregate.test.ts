import { describe, it, expect } from 'vitest'
import {
  createBotAggregate,
  updateBotStatus,
  addRecording,
  addTranscript,
} from './bot-aggregate'
import type { Bot } from '../entities/bot'
import type { Recording } from '../entities/recording'
import type { Transcript } from '../entities/transcript'
import type { BotStatus } from '../value-objects/bot-status'
import { ValidationError } from '../errors/validation-error'
import { ConflictError } from '../errors/conflict-error'
import type {
  BotStatusChangedEvent,
  RecordingReadyEvent,
  TranscriptArrivedEvent,
} from '../events'

function buildBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    meetingUrl: 'https://zoom.us/j/123',
    platform: 'zoom',
    status: 'ready',
    region: 'us-east-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    statusUpdatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function buildRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-1',
    botId: 'bot-1',
    durationSecs: 1800,
    signedUrl: null,
    signedUrlExpiresAt: null,
    createdAt: new Date('2026-01-01T01:00:00Z'),
    ...overrides,
  }
}

function buildTranscript(overrides: Partial<Transcript> = {}): Transcript {
  return {
    id: 'tr-1',
    botId: 'bot-1',
    speakerId: 'speaker-1',
    words: [{ word: 'hello', startMs: 0, endMs: 500 }],
    confidence: 0.95,
    createdAt: new Date('2026-01-01T01:00:00Z'),
    ...overrides,
  }
}

describe('BotAggregate factory', () => {
  it('createBotAggregate: bot 単体、recordings / transcripts / pendingEvents は空配列', () => {
    const agg = createBotAggregate(buildBot())
    expect(agg.bot.id).toBe('bot-1')
    expect(agg.recordings).toEqual([])
    expect(agg.transcripts).toEqual([])
    expect(agg.pendingEvents).toEqual([])
  })

  it('immutability: frozen', () => {
    const agg = createBotAggregate(buildBot())
    expect(Object.isFrozen(agg)).toBe(true)
    expect(Object.isFrozen(agg.recordings)).toBe(true)
    expect(Object.isFrozen(agg.transcripts)).toBe(true)
  })
})

describe('updateBotStatus 状態遷移マシン', () => {
  // 許容遷移: ready→joining_call→in_call_not_recording→in_call_recording→call_ended→done
  // fatal は全状態から遷移可能
  const allowedTransitions: Array<[BotStatus, BotStatus]> = [
    ['ready', 'joining_call'],
    ['joining_call', 'in_call_not_recording'],
    ['joining_call', 'in_call_recording'],
    ['joining_call', 'fatal'],
    ['in_call_not_recording', 'in_call_recording'],
    ['in_call_not_recording', 'call_ended'],
    ['in_call_recording', 'call_ended'],
    ['in_call_recording', 'done'],
    ['call_ended', 'done'],
    ['ready', 'fatal'],
    ['in_call_recording', 'fatal'],
  ]

  for (const [from, to] of allowedTransitions) {
    it(`OK: ${from} → ${to}`, () => {
      const agg = createBotAggregate(buildBot({ status: from }))
      const result = updateBotStatus(agg, to)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('unexpected err')
      expect(result.value.bot.status).toBe(to)
      const event = result.value.pendingEvents[0] as BotStatusChangedEvent
      expect(event.eventType).toBe('BotStatusChanged')
      expect(event.payload.oldStatus).toBe(from)
      expect(event.payload.newStatus).toBe(to)
    })
  }

  const disallowedTransitions: Array<[BotStatus, BotStatus]> = [
    ['done', 'ready'],
    ['done', 'in_call_recording'],
    ['fatal', 'ready'],
    ['call_ended', 'ready'],
    ['ready', 'in_call_recording'],
    ['ready', 'done'],
  ]

  for (const [from, to] of disallowedTransitions) {
    it(`NG: ${from} → ${to}`, () => {
      const agg = createBotAggregate(buildBot({ status: from }))
      const result = updateBotStatus(agg, to)
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('unexpected ok')
      expect(result.error).toBeInstanceOf(ValidationError)
    })
  }

  it('immutability: 元 aggregate は変化なし', () => {
    const agg = createBotAggregate(buildBot({ status: 'ready' }))
    updateBotStatus(agg, 'joining_call')
    expect(agg.bot.status).toBe('ready')
  })
})

describe('addRecording', () => {
  it('正常: 一致する botId の recording を追加、RecordingReadyEvent 発行', () => {
    const agg = createBotAggregate(buildBot())
    const rec = buildRecording({ durationSecs: 600 })
    const result = addRecording(agg, rec)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    expect(result.value.recordings).toHaveLength(1)
    expect(result.value.recordings[0]?.id).toBe('rec-1')
    const event = result.value.pendingEvents[0] as RecordingReadyEvent
    expect(event.eventType).toBe('RecordingReady')
    expect(event.payload.botId).toBe('bot-1')
    expect(event.payload.recordingId).toBe('rec-1')
    expect(event.payload.durationSecs).toBe(600)
  })

  it('NG: botId 不一致は ValidationError', () => {
    const agg = createBotAggregate(buildBot({ id: 'bot-1' }))
    const rec = buildRecording({ botId: 'bot-2' })
    const result = addRecording(agg, rec)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unexpected ok')
    expect(result.error).toBeInstanceOf(ValidationError)
  })

  it('NG: 同 id の recording 重複追加は ConflictError', () => {
    const agg = createBotAggregate(buildBot())
    const first = addRecording(agg, buildRecording({ id: 'rec-1' }))
    if (!first.ok) throw new Error('first add failed')
    const second = addRecording(first.value, buildRecording({ id: 'rec-1' }))
    expect(second.ok).toBe(false)
    if (second.ok) throw new Error('unexpected ok')
    expect(second.error).toBeInstanceOf(ConflictError)
  })

  it('immutability: frozen 維持', () => {
    const agg = createBotAggregate(buildBot())
    const result = addRecording(agg, buildRecording())
    if (!result.ok) throw new Error('unexpected err')
    expect(Object.isFrozen(result.value)).toBe(true)
    expect(Object.isFrozen(result.value.recordings)).toBe(true)
  })
})

describe('addTranscript', () => {
  it('正常: 一致する botId の transcript を追加、TranscriptArrivedEvent 発行', () => {
    const agg = createBotAggregate(buildBot())
    const tr = buildTranscript({
      id: 'tr-1',
      speakerId: 'speaker-1',
      words: [
        { word: 'hello', startMs: 0, endMs: 500 },
        { word: 'world', startMs: 500, endMs: 1000 },
      ],
    })
    const result = addTranscript(agg, tr)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    expect(result.value.transcripts).toHaveLength(1)
    const event = result.value.pendingEvents[0] as TranscriptArrivedEvent
    expect(event.eventType).toBe('TranscriptArrived')
    expect(event.payload.botId).toBe('bot-1')
    expect(event.payload.transcriptId).toBe('tr-1')
    expect(event.payload.speakerId).toBe('speaker-1')
    expect(event.payload.wordCount).toBe(2)
  })

  it('speakerId が null でも追加可能', () => {
    const agg = createBotAggregate(buildBot())
    const tr = buildTranscript({ speakerId: null })
    const result = addTranscript(agg, tr)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    const event = result.value.pendingEvents[0] as TranscriptArrivedEvent
    expect(event.payload.speakerId).toBeNull()
  })

  it('NG: botId 不一致は ValidationError', () => {
    const agg = createBotAggregate(buildBot({ id: 'bot-1' }))
    const tr = buildTranscript({ botId: 'bot-2' })
    const result = addTranscript(agg, tr)
    expect(result.ok).toBe(false)
  })

  it('NG: 同 id の transcript 重複追加は ConflictError', () => {
    const agg = createBotAggregate(buildBot())
    const first = addTranscript(agg, buildTranscript({ id: 'tr-1' }))
    if (!first.ok) throw new Error('first add failed')
    const second = addTranscript(first.value, buildTranscript({ id: 'tr-1' }))
    expect(second.ok).toBe(false)
    if (second.ok) throw new Error('unexpected ok')
    expect(second.error).toBeInstanceOf(ConflictError)
  })
})
