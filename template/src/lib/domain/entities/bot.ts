// src/lib/domain/entities/bot.ts
// Bot entity — Recall.ai meeting bot session.

import type { BotStatus } from '../value-objects/bot-status'
import type { MeetingPlatform } from '../value-objects/meeting-platform'
import type { Region } from '../value-objects/region'

export interface Bot {
  readonly id: string
  readonly meetingUrl: string
  readonly platform: MeetingPlatform
  readonly status: BotStatus
  readonly region: Region
  readonly createdAt: Date
  readonly statusUpdatedAt: Date
}
