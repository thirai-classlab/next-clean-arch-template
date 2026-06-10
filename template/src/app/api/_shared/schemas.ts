// src/app/api/_shared/schemas.ts
// Provisional zod request schemas for API Route Handlers (Wave 6-K).
//
// SSoT note (draft 06 §3.5): REST DTO schemas should live in
// `packages/contracts/`. These provisional schemas are local until contracts
// package is wired up in a later Wave. Migration path: copy schema -> contracts,
// re-export here for compat, then delete this file once all callers migrated.

import { z } from 'zod'
import { REGIONS, type Region } from '@/lib/domain/value-objects/region'
import {
  BOT_STATUSES,
  type BotStatus,
} from '@/lib/domain/value-objects/bot-status'

// --- Bots ---
// Enum values derive from domain VOs (SSoT) to prevent drift. We re-narrow the
// inferred zod output to the domain literal union so UseCase inputs stay typed.
export const CreateBotRequestSchema = z.object({
  meetingUrl: z.string().url(),
  region: z
    .enum(REGIONS as unknown as [Region, ...Region[]])
    .optional(),
})
export type CreateBotRequest = z.infer<typeof CreateBotRequestSchema>

export const ListBotsQuerySchema = z.object({
  status: z
    .enum(BOT_STATUSES as unknown as [BotStatus, ...BotStatus[]])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
})
export type ListBotsQuery = z.infer<typeof ListBotsQuerySchema>

// --- Transcripts ---
export const GetTranscriptsQuerySchema = z.object({
  botId: z.string().min(1),
})
export type GetTranscriptsQuery = z.infer<typeof GetTranscriptsQuerySchema>

// --- Calendar ---
export const ListCalendarEventsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
})
export type ListCalendarEventsQuery = z.infer<typeof ListCalendarEventsQuerySchema>

// --- Webhook ---
export const WebhookSignatureHeader = 'x-recall-signature'
