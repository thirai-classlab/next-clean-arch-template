// src/lib/infrastructure/adapters/mock/mock-bot-orchestrator.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockBotOrchestratorAdapter } from './mock-bot-orchestrator.adapter'
import { NotFoundError } from '../../../domain/errors'

describe('MockBotOrchestratorAdapter', () => {
  let adapter: MockBotOrchestratorAdapter

  beforeEach(() => {
    adapter = new MockBotOrchestratorAdapter()
  })

  it('createBot returns a botId and persists Bot in ready status', async () => {
    const r = await adapter.createBot({
      meetingUrl: 'https://zoom.us/j/123',
      region: 'us-east-1',
      webhookUrl: 'https://example.com/webhook',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const get = await adapter.getBot(r.value.botId)
      expect(get.ok).toBe(true)
      if (get.ok) expect(get.value.status).toBe('ready')
    }
  })

  it('getBot returns NotFoundError for an unknown id', async () => {
    const r = await adapter.getBot('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('deleteBot removes the Bot', async () => {
    const c = await adapter.createBot({
      meetingUrl: 'https://meet.google.com/abc',
      region: 'us-east-1',
      webhookUrl: 'https://example.com/webhook',
    })
    if (!c.ok) throw new Error('seed failed')
    const d = await adapter.deleteBot(c.value.botId)
    expect(d.ok).toBe(true)
    const after = await adapter.getBot(c.value.botId)
    expect(after.ok).toBe(false)
  })

  it('listBots returns all created bots and supports limit', async () => {
    for (let i = 0; i < 3; i++) {
      await adapter.createBot({
        meetingUrl: `https://meet.google.com/${i}`,
        region: 'us-east-1',
        webhookUrl: 'https://example.com/webhook',
      })
    }
    const all = await adapter.listBots()
    expect(all.ok).toBe(true)
    if (all.ok) expect(all.value).toHaveLength(3)

    const limited = await adapter.listBots({ limit: 2 })
    if (limited.ok) expect(limited.value).toHaveLength(2)
  })

  it('listBots filters by status', async () => {
    const r = await adapter.listBots({ status: 'done' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toHaveLength(0)
  })
})
