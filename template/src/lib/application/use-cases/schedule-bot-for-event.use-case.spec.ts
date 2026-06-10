import { describe, it, expect } from 'vitest'
import { ScheduleBotForEventUseCase } from './schedule-bot-for-event.use-case'
import type { CalendarEventRepository } from '../repositories/calendar-event.repository'
import type { BotOrchestratorPort } from '../ports/bot-orchestrator.port'
import type { BotRepository } from '../repositories/bot.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('ScheduleBotForEventUseCase (signature)', () => {
  const calendarEventRepo = {} as CalendarEventRepository
  const botOrchestratorPort = {} as BotOrchestratorPort
  const botRepo = {} as BotRepository

  it('is constructible with CalendarEventRepository + BotOrchestratorPort + BotRepository', () => {
    const uc = new ScheduleBotForEventUseCase(
      calendarEventRepo,
      botOrchestratorPort,
      botRepo,
    )
    expect(uc).toBeInstanceOf(ScheduleBotForEventUseCase)
  })

  it('exposes execute()', () => {
    const uc = new ScheduleBotForEventUseCase(
      calendarEventRepo,
      botOrchestratorPort,
      botRepo,
    )
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new ScheduleBotForEventUseCase(
      calendarEventRepo,
      botOrchestratorPort,
      botRepo,
    )
    const r = await uc.execute({ calendarEventId: 'ce1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
