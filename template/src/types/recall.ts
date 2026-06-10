// src/types/recall.ts — Recall.ai POC domain types (zod-backed)
//
// SSoT (Source of Truth): packages/contracts/ への移行は後続 task。
// この file は web フロント単体で完結する mock 用の型定義。

import { z } from 'zod'

// ─── Bot ──────────────────────────────────────────────────────
export const BotStatusSchema = z.enum([
  'joining',
  'in_call',
  'recording_done',
  'transcript_processing',
  'done',
  'fatal_error',
])
export type BotStatus = z.infer<typeof BotStatusSchema>

export const BotPlatformSchema = z.enum([
  'Zoom',
  'Google Meet',
  'Microsoft Teams',
  'Webex',
  'Slack Huddles',
  'GoTo',
])
export type BotPlatform = z.infer<typeof BotPlatformSchema>

export const BotSchema = z.object({
  id: z.string(),
  name: z.string(),
  useCase: z.string(),
  platform: BotPlatformSchema,
  meetingUrl: z.string(),
  transcriptionProvider: z.string(),
  realtimeMode: z.enum(['low_latency', 'accuracy']),
  participants: z.array(z.string()),
  status: BotStatusSchema,
  startedAt: z.string(),
  durationSec: z.number().int().min(0),
})
export type Bot = z.infer<typeof BotSchema>

// ─── Transcript segment ──────────────────────────────────────
export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  botId: z.string(),
  speaker: z.string(),
  text: z.string(),
  at: z.string(), // HH:MM:SS
  isFinal: z.boolean(),
})
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>

// ─── Webhook event ───────────────────────────────────────────
export const WebhookTypeSchema = z.enum([
  'transcript.data',
  'transcript.partial',
  'bot.status_change',
  'recording.done',
  'bot.permission_denied',
])
export type WebhookType = z.infer<typeof WebhookTypeSchema>

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: WebhookTypeSchema,
  botId: z.string(),
  at: z.string(),
  payloadPreview: z.string(),
})
export type WebhookEvent = z.infer<typeof WebhookEventSchema>

// ─── Feature catalog (Home rail) ─────────────────────────────
export const FeatureSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  route: z.string(),
  desc: z.string(),
  tag: z.enum(['capture', 'process', 'output', 'integrate', 'ref']),
  highlight: z.boolean().optional(),
  badge: z.string().optional(),
  stub: z.boolean().optional(),
})
export type Feature = z.infer<typeof FeatureSchema>

// ─── KPI summary (derived) ───────────────────────────────────
export interface KpiSummary {
  activeBots: number
  inCall: number
  joining: number
  finishedToday: number
  segments: number
  webhooks: number
}

// ─── Tick speed ──────────────────────────────────────────────
export type TickSpeed = 'paused' | 'slow' | 'normal' | 'fast'
