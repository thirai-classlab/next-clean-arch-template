import { describe, it, expect } from 'vitest'
import { HandleBotWebhookUseCase } from './handle-bot-webhook.use-case'
import type { WebhookVerifierPort } from '../ports/webhook-verifier.port'
import type { WebhookEventRepository } from '../repositories/webhook-event.repository'
import type { BotRepository } from '../repositories/bot.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('HandleBotWebhookUseCase (signature)', () => {
  const webhookVerifierPort = {} as WebhookVerifierPort
  const webhookEventRepo = {} as WebhookEventRepository
  const botRepo = {} as BotRepository

  it('is constructible with WebhookVerifierPort + 2 repos', () => {
    const uc = new HandleBotWebhookUseCase(
      webhookVerifierPort,
      webhookEventRepo,
      botRepo,
    )
    expect(uc).toBeInstanceOf(HandleBotWebhookUseCase)
  })

  it('exposes execute()', () => {
    const uc = new HandleBotWebhookUseCase(
      webhookVerifierPort,
      webhookEventRepo,
      botRepo,
    )
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new HandleBotWebhookUseCase(
      webhookVerifierPort,
      webhookEventRepo,
      botRepo,
    )
    const r = await uc.execute({ rawBody: '{}', signature: 'sig', payload: {} })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
