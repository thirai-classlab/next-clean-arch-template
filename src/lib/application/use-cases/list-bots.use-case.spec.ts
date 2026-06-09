import { describe, it, expect } from 'vitest'
import { ListBotsUseCase } from './list-bots.use-case'
import type { BotRepository } from '../repositories/bot.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('ListBotsUseCase (signature)', () => {
  const botRepo = {} as BotRepository

  it('is constructible with BotRepository', () => {
    const uc = new ListBotsUseCase(botRepo)
    expect(uc).toBeInstanceOf(ListBotsUseCase)
  })

  it('exposes execute()', () => {
    const uc = new ListBotsUseCase(botRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new ListBotsUseCase(botRepo)
    const r = await uc.execute({ page: 1 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
