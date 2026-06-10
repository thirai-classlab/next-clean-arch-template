// src/lib/infrastructure/adapters/mock/mock-bot-orchestrator.adapter.ts
// In-memory Recall.ai Bot fake. Bots start in `ready` state.

import { injectable } from 'tsyringe'
import type { BotOrchestratorPort } from '../../../application/ports/bot-orchestrator.port'
import { ok, err, type Result } from '../../../application/result'
import {
  NotFoundError,
  type ExternalServiceError,
} from '../../../domain/errors'
import type { Bot } from '../../../domain/entities/bot'
import type { BotStatus } from '../../../domain/value-objects/bot-status'
import type { Region } from '../../../domain/value-objects/region'
import type { MeetingPlatform } from '../../../domain/value-objects/meeting-platform'

function inferPlatform(url: string): MeetingPlatform {
  if (url.includes('zoom.us')) return 'zoom'
  if (url.includes('meet.google.com')) return 'google_meet'
  if (url.includes('teams.microsoft.com')) return 'microsoft_teams'
  return 'zoom'
}

@injectable()
export class MockBotOrchestratorAdapter implements BotOrchestratorPort {
  private bots = new Map<string, Bot>()
  private counter = 0

  async createBot(params: {
    meetingUrl: string
    region: Region
    webhookUrl: string
  }): Promise<Result<{ botId: string }, ExternalServiceError>> {
    const botId = `mock-bot-${++this.counter}`
    const now = new Date()
    this.bots.set(botId, {
      id: botId,
      meetingUrl: params.meetingUrl,
      platform: inferPlatform(params.meetingUrl),
      status: 'ready',
      region: params.region,
      createdAt: now,
      statusUpdatedAt: now,
    })
    return ok({ botId })
  }

  async getBot(
    botId: string,
  ): Promise<Result<Bot, NotFoundError | ExternalServiceError>> {
    const b = this.bots.get(botId)
    if (!b) return err(new NotFoundError('bot', botId))
    return ok(b)
  }

  async deleteBot(
    botId: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>> {
    if (!this.bots.delete(botId)) return err(new NotFoundError('bot', botId))
    return ok(undefined as void)
  }

  async listBots(filters?: {
    status?: BotStatus
    limit?: number
  }): Promise<Result<ReadonlyArray<Bot>, ExternalServiceError>> {
    let all = Array.from(this.bots.values())
    if (filters?.status) all = all.filter((b) => b.status === filters.status)
    if (filters?.limit !== undefined) all = all.slice(0, filters.limit)
    return ok(all)
  }
}
