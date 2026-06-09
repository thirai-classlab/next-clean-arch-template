// src/lib/infrastructure/adapters/mock/mock-queue.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockQueueAdapter } from './mock-queue.adapter'

describe('MockQueueAdapter', () => {
  let adapter: MockQueueAdapter

  beforeEach(() => {
    adapter = new MockQueueAdapter()
  })

  it('enqueue returns a deterministic jobId and stores payload', async () => {
    const r = await adapter.enqueue('q', { msg: 'hi' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.jobId).toBeTruthy()

    const items = adapter.peek('q')
    expect(items).toHaveLength(1)
    expect(items[0]?.payload).toEqual({ msg: 'hi' })
  })

  it('supports delayMs option', async () => {
    await adapter.enqueue('q', { x: 1 }, { delayMs: 1000 })
    const items = adapter.peek('q')
    expect(items[0]?.delayMs).toBe(1000)
  })
})
