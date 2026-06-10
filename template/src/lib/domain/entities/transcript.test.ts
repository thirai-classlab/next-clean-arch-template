import { describe, it, expect } from 'vitest'
import type { Transcript } from './transcript'

describe('Transcript entity', () => {
  it('構造一致: words は word/startMs/endMs を持つ ReadonlyArray', () => {
    const tr: Transcript = {
      id: 'tr-1',
      botId: 'bot-1',
      speakerId: 'speaker-a',
      words: [
        { word: 'hello', startMs: 0, endMs: 500 },
        { word: 'world', startMs: 600, endMs: 1200 },
      ],
      confidence: 0.95,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }

    expect(tr.id).toBe('tr-1')
    expect(tr.botId).toBe('bot-1')
    expect(tr.speakerId).toBe('speaker-a')
    expect(tr.words).toHaveLength(2)
    expect(tr.words[0].word).toBe('hello')
    expect(tr.words[1].startMs).toBe(600)
    expect(tr.confidence).toBe(0.95)
  })

  it('speakerId は null 許容 (話者特定不能時)', () => {
    const tr: Transcript = {
      id: 'tr-2',
      botId: 'bot-2',
      speakerId: null,
      words: [],
      confidence: 0,
      createdAt: new Date(),
    }

    expect(tr.speakerId).toBeNull()
    expect(tr.words).toHaveLength(0)
  })

  it('readonly: words.push は型エラー (ReadonlyArray)', () => {
    const tr: Transcript = {
      id: 'tr-3',
      botId: 'bot-3',
      speakerId: null,
      words: [{ word: 'a', startMs: 0, endMs: 100 }],
      confidence: 0.5,
      createdAt: new Date(),
    }

    // @ts-expect-error - words is ReadonlyArray, push is not allowed
    tr.words.push({ word: 'b', startMs: 100, endMs: 200 })
    expect(tr.words).toHaveLength(2)
  })
})
