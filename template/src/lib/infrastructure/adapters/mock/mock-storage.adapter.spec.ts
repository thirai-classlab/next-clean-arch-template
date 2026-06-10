// src/lib/infrastructure/adapters/mock/mock-storage.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockStorageAdapter } from './mock-storage.adapter'
import { NotFoundError } from '../../../domain/errors'

describe('MockStorageAdapter', () => {
  let adapter: MockStorageAdapter

  beforeEach(() => {
    adapter = new MockStorageAdapter()
  })

  it('upload returns the supplied key', async () => {
    const r = await adapter.upload('b', 'k', new Uint8Array([1, 2, 3]))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.key).toBe('k')
  })

  it('getSignedUrl returns a URL with expiresAt for an uploaded key', async () => {
    await adapter.upload('b', 'k', new Uint8Array([1]))
    const r = await adapter.getSignedUrl('b', 'k', 60)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.url).toContain('mock-signed-url')
      expect(r.value.expiresAt).toBeInstanceOf(Date)
    }
  })

  it('getSignedUrl returns NotFoundError for an unknown key', async () => {
    const r = await adapter.getSignedUrl('b', 'missing', 60)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('delete removes an uploaded key', async () => {
    await adapter.upload('b', 'k', new Uint8Array([1]))
    const r = await adapter.delete('b', 'k')
    expect(r.ok).toBe(true)
    const after = await adapter.getSignedUrl('b', 'k', 60)
    expect(after.ok).toBe(false)
  })

  it('delete returns NotFoundError for unknown key', async () => {
    const r = await adapter.delete('b', 'missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })
})
