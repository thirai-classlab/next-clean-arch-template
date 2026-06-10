// src/lib/infrastructure/adapters/mock/mock-calendar.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockCalendarAdapter } from './mock-calendar.adapter'

describe('MockCalendarAdapter', () => {
  let adapter: MockCalendarAdapter

  beforeEach(() => {
    adapter = new MockCalendarAdapter()
  })

  it('syncEvents returns a seeded event list and nextSyncToken', async () => {
    const r = await adapter.syncEvents({})
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.events.length).toBeGreaterThan(0)
      expect(r.value.nextSyncToken).toBeTruthy()
    }
  })

  it('filters events when since is provided', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10)
    const r = await adapter.syncEvents({ since: future })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.events).toHaveLength(0)
  })
})
