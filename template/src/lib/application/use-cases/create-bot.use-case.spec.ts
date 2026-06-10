import { describe, it, expect } from 'vitest'
import { CreateBotUseCase } from './create-bot.use-case'
import type { BotOrchestratorPort } from '../ports/bot-orchestrator.port'
import type { QueuePort } from '../ports/queue.port'
import type { BotRepository } from '../repositories/bot.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('CreateBotUseCase (signature)', () => {
  const botOrchestratorPort = {} as BotOrchestratorPort
  const botRepo = {} as BotRepository
  const queuePort = {} as QueuePort

  it('is constructible with BotOrchestratorPort + BotRepository + QueuePort', () => {
    const uc = new CreateBotUseCase(botOrchestratorPort, botRepo, queuePort)
    expect(uc).toBeInstanceOf(CreateBotUseCase)
  })

  it('exposes execute()', () => {
    const uc = new CreateBotUseCase(botOrchestratorPort, botRepo, queuePort)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new CreateBotUseCase(botOrchestratorPort, botRepo, queuePort)
    const r = await uc.execute({ meetingUrl: 'https://meet.example/x' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
