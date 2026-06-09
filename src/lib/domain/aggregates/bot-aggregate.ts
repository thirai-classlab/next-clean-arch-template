// src/lib/domain/aggregates/bot-aggregate.ts
// BotAggregate — Bot + recordings + transcripts + pendingEvents の集約 root。
// draft 06 §1.3 L262-271 準拠。状態遷移マシン + 整合性検証 + immutable 更新。

import type { Bot } from '../entities/bot'
import type { Recording } from '../entities/recording'
import type { Transcript } from '../entities/transcript'
import type { BotStatus } from '../value-objects/bot-status'
import type {
  DomainEvent,
  BotStatusChangedEvent,
  RecordingReadyEvent,
  TranscriptArrivedEvent,
} from '../events'
import { type Result, ok, err } from '@/lib/application/result'
import { ValidationError } from '../errors/validation-error'
import { ConflictError } from '../errors/conflict-error'

export interface BotAggregate {
  readonly bot: Bot
  readonly recordings: ReadonlyArray<Recording>
  readonly transcripts: ReadonlyArray<Transcript>
  readonly pendingEvents: ReadonlyArray<DomainEvent>
}

export function createBotAggregate(bot: Bot): BotAggregate {
  return Object.freeze({
    bot,
    recordings: Object.freeze([] as ReadonlyArray<Recording>),
    transcripts: Object.freeze([] as ReadonlyArray<Transcript>),
    pendingEvents: Object.freeze([] as ReadonlyArray<DomainEvent>),
  })
}

// Recall.ai bot lifecycle に即した許容遷移表。
// fatal は全状態から到達可能 (障害は不可逆)。done は最終状態。
const ALLOWED_TRANSITIONS: Readonly<Record<BotStatus, ReadonlyArray<BotStatus>>> =
  Object.freeze({
    ready: ['joining_call', 'fatal'],
    joining_call: ['in_call_not_recording', 'in_call_recording', 'fatal'],
    in_call_not_recording: ['in_call_recording', 'call_ended', 'fatal'],
    in_call_recording: ['call_ended', 'done', 'fatal'],
    call_ended: ['done', 'fatal'],
    done: [],
    fatal: [],
  })

function isAllowedTransition(from: BotStatus, to: BotStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function updateBotStatus(
  agg: BotAggregate,
  newStatus: BotStatus,
): Result<BotAggregate, ValidationError> {
  const oldStatus = agg.bot.status
  if (!isAllowedTransition(oldStatus, newStatus)) {
    return err(
      new ValidationError(
        `disallowed bot status transition: ${oldStatus} → ${newStatus}`,
      ),
    )
  }
  const newBot: Bot = { ...agg.bot, status: newStatus, statusUpdatedAt: new Date() }
  const event: BotStatusChangedEvent = {
    eventType: 'BotStatusChanged',
    occurredAt: new Date(),
    payload: { botId: agg.bot.id, oldStatus, newStatus },
  }
  return ok(
    Object.freeze({
      ...agg,
      bot: newBot,
      pendingEvents: Object.freeze([...agg.pendingEvents, event]),
    }),
  )
}

export function addRecording(
  agg: BotAggregate,
  recording: Recording,
): Result<BotAggregate, ValidationError | ConflictError> {
  if (recording.botId !== agg.bot.id) {
    return err(
      new ValidationError(
        `recording.botId ${recording.botId} does not match bot.id ${agg.bot.id}`,
      ),
    )
  }
  if (agg.recordings.some((r) => r.id === recording.id)) {
    return err(
      new ConflictError(`recording ${recording.id} already exists in aggregate`),
    )
  }
  const event: RecordingReadyEvent = {
    eventType: 'RecordingReady',
    occurredAt: new Date(),
    payload: {
      botId: agg.bot.id,
      recordingId: recording.id,
      durationSecs: recording.durationSecs,
    },
  }
  return ok(
    Object.freeze({
      ...agg,
      recordings: Object.freeze([...agg.recordings, recording]),
      pendingEvents: Object.freeze([...agg.pendingEvents, event]),
    }),
  )
}

export function addTranscript(
  agg: BotAggregate,
  transcript: Transcript,
): Result<BotAggregate, ValidationError | ConflictError> {
  if (transcript.botId !== agg.bot.id) {
    return err(
      new ValidationError(
        `transcript.botId ${transcript.botId} does not match bot.id ${agg.bot.id}`,
      ),
    )
  }
  if (agg.transcripts.some((t) => t.id === transcript.id)) {
    return err(
      new ConflictError(
        `transcript ${transcript.id} already exists in aggregate`,
      ),
    )
  }
  const event: TranscriptArrivedEvent = {
    eventType: 'TranscriptArrived',
    occurredAt: new Date(),
    payload: {
      botId: agg.bot.id,
      transcriptId: transcript.id,
      speakerId: transcript.speakerId,
      wordCount: transcript.words.length,
    },
  }
  return ok(
    Object.freeze({
      ...agg,
      transcripts: Object.freeze([...agg.transcripts, transcript]),
      pendingEvents: Object.freeze([...agg.pendingEvents, event]),
    }),
  )
}
