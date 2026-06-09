// src/lib/infrastructure/adapters/mock/mock-media-server.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockMediaServerAdapter } from './mock-media-server.adapter'
import { NotFoundError } from '../../../domain/errors'

describe('MockMediaServerAdapter', () => {
  let adapter: MockMediaServerAdapter

  beforeEach(() => {
    adapter = new MockMediaServerAdapter()
  })

  it('createRoom returns a roomId + joinUrl', async () => {
    const r = await adapter.createRoom({ name: 'team-sync' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.roomId).toBeTruthy()
      expect(r.value.joinUrl).toContain('mock-media-server')
    }
  })

  it('closeRoom returns NotFoundError for unknown room', async () => {
    const r = await adapter.closeRoom('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('closeRoom removes a created room', async () => {
    const c = await adapter.createRoom({ name: 'x' })
    if (!c.ok) throw new Error('seed failed')
    const r = await adapter.closeRoom(c.value.roomId)
    expect(r.ok).toBe(true)
  })
})
