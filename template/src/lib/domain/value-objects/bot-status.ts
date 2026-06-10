// src/lib/domain/value-objects/bot-status.ts
// BotStatus VO — Recall.ai bot lifecycle states.

export const BOT_STATUSES = Object.freeze([
  'ready',
  'joining_call',
  'in_call_not_recording',
  'in_call_recording',
  'call_ended',
  'done',
  'fatal',
] as const)
export type BotStatus = (typeof BOT_STATUSES)[number]
