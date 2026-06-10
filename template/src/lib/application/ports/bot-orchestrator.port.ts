// src/lib/application/ports/bot-orchestrator.port.ts
// BotOrchestratorPort — abstracts Recall.ai Bot API. Implementations:
// RecallAiBotAdapter (real) / MockBotAdapter (POC, MOCK_MODE=true).

import type { Result } from '../result'
import type { Bot } from '../../domain/entities/bot'
import type { BotStatus } from '../../domain/value-objects/bot-status'
import type { Region } from '../../domain/value-objects/region'
import type {
  ExternalServiceError,
  NotFoundError,
} from '../../domain/errors'

export interface BotOrchestratorPort {
  createBot(params: {
    meetingUrl: string
    region: Region
    webhookUrl: string
  }): Promise<Result<{ botId: string }, ExternalServiceError>>

  getBot(
    botId: string,
  ): Promise<Result<Bot, NotFoundError | ExternalServiceError>>

  deleteBot(
    botId: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>>

  listBots(filters?: {
    status?: BotStatus
    limit?: number
  }): Promise<Result<ReadonlyArray<Bot>, ExternalServiceError>>
}
