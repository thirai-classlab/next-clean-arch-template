// src/lib/store.ts — Zustand singleton store + ticking simulation.
//
// Port: docs/design-import/project/app/store.jsx (useRecallStore + tick logic).
//
// Differences from source:
//   - React hook → Zustand store (typesafe, no manual listener Set).
//   - SSR-safe: tick interval lives in a module-level singleton guarded by
//     `typeof window !== 'undefined'`.
//   - Speed change is exposed as a setter; the store handles interval lifecycle.

import { create } from 'zustand'
import {
  SEED_BOTS,
  TRANSCRIPT_SEED,
  WEBHOOK_TYPES,
  FRESH_BOT_NAMES,
  FRESH_BOT_PLATFORMS,
  FRESH_BOT_USECASES,
} from '@/lib/mock-data'
import { pickWeighted, prependCapped, relTime } from '@/lib/utils'
import type { Bot, KpiSummary, TickSpeed, TranscriptSegment, WebhookEvent } from '@/types/recall'

const SPEED_MS: Record<TickSpeed, number | null> = {
  paused: null,
  slow:   2400,
  normal: 1200,
  fast:   500,
}

// ─── Initial state ───────────────────────────────────────────
function buildInitialTranscripts(): TranscriptSegment[] {
  const out: TranscriptSegment[] = []
  for (let i = 0; i < 9; i++) {
    const seg = TRANSCRIPT_SEED[i % TRANSCRIPT_SEED.length]!
    out.push({
      id: `seg_${i}`,
      botId: seg.bot,
      speaker: seg.speaker,
      text: seg.text,
      at: relTime(-90 + i * 8),
      isFinal: true,
    })
  }
  return out
}

function buildInitialWebhooks(): WebhookEvent[] {
  const types: Array<WebhookEvent['type']> = [
    'bot.status_change',
    'transcript.data',
    'transcript.data',
    'recording.done',
    'transcript.data',
    'bot.status_change',
  ]
  return types.map((type, i) => ({
    id: `wh_${i}`,
    type,
    botId: SEED_BOTS[i % SEED_BOTS.length]!.id,
    at: relTime(-120 + i * 12),
    payloadPreview:
      type === 'transcript.data'  ? '{ words: 8, speaker: ... }' :
      type === 'recording.done'   ? '{ url: s3://…/rec.mp4 }' :
                                    '{ from: in_call, to: done }',
  }))
}

// ─── Store ───────────────────────────────────────────────────
interface RecallStore {
  bots: Bot[]
  transcripts: TranscriptSegment[]
  webhooks: WebhookEvent[]
  latencyMs: number
  tickCount: number
  speed: TickSpeed

  setSpeed: (s: TickSpeed) => void
  tick: () => void
  kpis: () => KpiSummary
}

export const useRecallStore = create<RecallStore>((set, get) => ({
  bots:        SEED_BOTS.map(b => ({ ...b })),
  transcripts: buildInitialTranscripts(),
  webhooks:    buildInitialWebhooks(),
  latencyMs:   920,
  tickCount:   0,
  speed:       'normal',

  setSpeed: (s) => {
    if (s === get().speed) return
    set({ speed: s })
    restartInterval(s)
  },

  tick: () => {
    const state = get()
    const beat = state.tickCount + 1

    // (a) progress bot durations + occasional status changes
    let bots: Bot[] = state.bots.map((b) => {
      let { status, durationSec } = b
      if (status === 'in_call' || status === 'joining') durationSec += 1
      if (status === 'joining' && beat % 5 === 0) status = 'in_call'
      return { ...b, status, durationSec }
    })

    let webhooks = state.webhooks

    if (beat % 28 === 0) {
      // finish one in_call bot (random round-robin) + emit recording.done
      const active = bots.filter((b) => b.status === 'in_call')
      if (active.length > 0) {
        const target = active[beat % active.length]!
        bots = bots.map((b) => (b.id === target.id ? { ...b, status: 'done' } : b))
        webhooks = prependCapped(
          webhooks,
          {
            id: `wh_t${beat}_done`,
            type: 'recording.done',
            botId: target.id,
            at: relTime(0),
            payloadPreview: `{ url: s3://recall-poc/rec/${target.id.slice(0, 8)}.mp4 }`,
          },
          30,
        )
      }

      // spin up a fresh joining bot
      const idx = beat % FRESH_BOT_NAMES.length
      const newBot: Bot = {
        id: `bot_${Math.random().toString(36).slice(2, 10)}`,
        name: FRESH_BOT_NAMES[idx]!,
        useCase: FRESH_BOT_USECASES[idx]!,
        platform: FRESH_BOT_PLATFORMS[idx]!,
        meetingUrl: `meet.google.com/${Math.random().toString(36).slice(2, 5)}-xyz`,
        transcriptionProvider: 'deepgram',
        realtimeMode: 'low_latency',
        participants: ['—'],
        status: 'joining',
        startedAt: relTime(0).slice(0, 5),
        durationSec: 0,
      }
      bots = [newBot, ...bots].slice(0, 8)
    }

    // (b) transcript: append one segment to a random in_call bot
    let transcripts = state.transcripts
    const inCall = bots.filter((b) => b.status === 'in_call')
    if (inCall.length > 0) {
      const targetBot = inCall[beat % inCall.length]!
      const matching = TRANSCRIPT_SEED.filter((s) => s.bot === targetBot.id)
      const seed =
        matching.length > 0
          ? matching[beat % matching.length]!
          : TRANSCRIPT_SEED[beat % TRANSCRIPT_SEED.length]!
      transcripts = prependCapped(
        transcripts,
        {
          id: `seg_t${beat}`,
          botId: targetBot.id,
          speaker: seed.speaker,
          text: seed.text,
          at: relTime(0),
          isFinal: beat % 4 !== 3,
        },
        60,
      )
    }

    // (c) webhook every ~1.5 beats
    if (beat % 2 !== 0 || beat % 5 === 0) {
      const t = pickWeighted(WEBHOOK_TYPES)
      webhooks = prependCapped(
        webhooks,
        {
          id: `wh_t${beat}`,
          type: t.type,
          botId: bots[beat % bots.length]!.id,
          at: relTime(0),
          payloadPreview:
            t.type.startsWith('transcript') ? `{ words: ${4 + (beat % 12)} }` :
            t.type === 'recording.done'     ? '{ format: mp4 }' :
                                              '{ from: joining, to: in_call }',
        },
        30,
      )
    }

    // (d) latency wander
    const latencyMs = Math.max(
      280,
      Math.min(1800, state.latencyMs + (Math.random() - 0.5) * 220),
    )

    set({ bots, transcripts, webhooks, latencyMs, tickCount: beat })
  },

  kpis: () => {
    const s = get()
    return {
      activeBots: s.bots.filter((b) => b.status === 'in_call' || b.status === 'joining').length,
      inCall:     s.bots.filter((b) => b.status === 'in_call').length,
      joining:    s.bots.filter((b) => b.status === 'joining').length,
      finishedToday: s.bots.filter((b) => b.status === 'done').length,
      segments:   s.transcripts.length,
      webhooks:   s.webhooks.length,
    }
  },
}))

// ─── Interval lifecycle (singleton, browser-only) ────────────
let _intervalId: ReturnType<typeof setInterval> | null = null

function restartInterval(speed: TickSpeed): void {
  if (typeof window === 'undefined') return
  if (_intervalId) {
    clearInterval(_intervalId)
    _intervalId = null
  }
  const ms = SPEED_MS[speed]
  if (ms != null) {
    _intervalId = setInterval(() => {
      useRecallStore.getState().tick()
    }, ms)
  }
}

/**
 * Initialize the ticking simulation. Call once from a Client Component
 * mounted near the root (e.g. AppShell). Safe to call multiple times —
 * subsequent calls reset the interval at the requested speed.
 */
export function initTicker(speed: TickSpeed = 'normal'): void {
  useRecallStore.getState().setSpeed(speed)
}
