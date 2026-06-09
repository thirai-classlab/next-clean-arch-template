// src/lib/infrastructure/adapters/mock/mock-realtime.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockRealtimeAdapter } from './mock-realtime.adapter'

describe('MockRealtimeAdapter', () => {
  let adapter: MockRealtimeAdapter

  beforeEach(() => {
    adapter = new MockRealtimeAdapter()
  })

  describe('publish + subscribe', () => {
    it('delivers published payloads to subscribers on the same channel', async () => {
      const received: number[] = []
      const sub = await adapter.subscribe<number>('ch1', (p) => {
        received.push(p)
      })
      expect(sub.ok).toBe(true)

      const pub = await adapter.publish('ch1', 7)
      expect(pub.ok).toBe(true)
      expect(received).toEqual([7])
    })

    it('does not deliver to other channels', async () => {
      const received: number[] = []
      await adapter.subscribe<number>('ch1', (p) => received.push(p))
      await adapter.publish('ch2', 9)
      expect(received).toEqual([])
    })

    it('unsubscribe stops further delivery', async () => {
      const received: number[] = []
      const sub = await adapter.subscribe<number>('ch1', (p) => received.push(p))
      if (sub.ok) sub.value()
      await adapter.publish('ch1', 1)
      expect(received).toEqual([])
    })
  })
})
