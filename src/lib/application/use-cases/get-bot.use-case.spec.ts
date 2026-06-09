import { describe, it, expect } from 'vitest'
import { GetBotUseCase } from './get-bot.use-case'
import type { BotRepository } from '../repositories/bot.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('GetBotUseCase (signature)', () => {
  const botRepo = {} as BotRepository

  it('is constructible with BotRepository', () => {
    const uc = new GetBotUseCase(botRepo)
    expect(uc).toBeInstanceOf(GetBotUseCase)
  })

  it('exposes execute()', () => {
    const uc = new GetBotUseCase(botRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new GetBotUseCase(botRepo)
    const r = await uc.execute({ botId: 'b1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
