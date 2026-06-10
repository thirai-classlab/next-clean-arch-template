import { describe, it, expect } from 'vitest'
import { DeleteBotUseCase } from './delete-bot.use-case'
import type { BotOrchestratorPort } from '../ports/bot-orchestrator.port'
import type { BotRepository } from '../repositories/bot.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('DeleteBotUseCase (signature)', () => {
  const botOrchestratorPort = {} as BotOrchestratorPort
  const botRepo = {} as BotRepository

  it('is constructible with BotOrchestratorPort + BotRepository', () => {
    const uc = new DeleteBotUseCase(botOrchestratorPort, botRepo)
    expect(uc).toBeInstanceOf(DeleteBotUseCase)
  })

  it('exposes execute()', () => {
    const uc = new DeleteBotUseCase(botOrchestratorPort, botRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new DeleteBotUseCase(botOrchestratorPort, botRepo)
    const r = await uc.execute({ botId: 'b1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
