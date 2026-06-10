import { describe, it, expectTypeOf } from 'vitest'
import type { BotOrchestratorPort } from './bot-orchestrator.port'
import type { Result } from '../result'
import type { Bot } from '../../domain/entities/bot'
import type { BotStatus } from '../../domain/value-objects/bot-status'
import type { Region } from '../../domain/value-objects/region'
import type {
  ExternalServiceError,
  NotFoundError,
} from '../../domain/errors'

describe('BotOrchestratorPort (type-level)', () => {
  it('createBot: (params) => Promise<Result<{botId}, ExternalServiceError>>', () => {
    expectTypeOf<BotOrchestratorPort['createBot']>().toEqualTypeOf<
      (params: {
        meetingUrl: string
        region: Region
        webhookUrl: string
      }) => Promise<Result<{ botId: string }, ExternalServiceError>>
    >()
  })

  it('getBot: (botId) => Promise<Result<Bot, NotFoundError|ExternalServiceError>>', () => {
    expectTypeOf<BotOrchestratorPort['getBot']>().toEqualTypeOf<
      (botId: string) => Promise<Result<Bot, NotFoundError | ExternalServiceError>>
    >()
  })

  it('deleteBot: (botId) => Promise<Result<void, NotFoundError|ExternalServiceError>>', () => {
    expectTypeOf<BotOrchestratorPort['deleteBot']>().toEqualTypeOf<
      (
        botId: string,
      ) => Promise<Result<void, NotFoundError | ExternalServiceError>>
    >()
  })

  it('listBots: (filters?) => Promise<Result<ReadonlyArray<Bot>, ExternalServiceError>>', () => {
    expectTypeOf<BotOrchestratorPort['listBots']>().toEqualTypeOf<
      (filters?: {
        status?: BotStatus
        limit?: number
      }) => Promise<Result<ReadonlyArray<Bot>, ExternalServiceError>>
    >()
  })
})
