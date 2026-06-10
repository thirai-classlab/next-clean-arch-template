// src/lib/infrastructure/adapters/mock/mock-db.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockDbAdapter } from './mock-db.adapter'
import { ok, err } from '../../../application/result'
import { ExternalServiceError } from '../../../domain/errors'

describe('MockDbAdapter', () => {
  let adapter: MockDbAdapter

  beforeEach(() => {
    adapter = new MockDbAdapter()
  })

  describe('withTransaction', () => {
    it('executes the callback and returns its ok value', async () => {
      const r = await adapter.withTransaction(async () => ok(42))
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBe(42)
    })

    it('propagates an err result from the callback (rollback semantics)', async () => {
      const e = new ExternalServiceError('mock-db', new Error('boom'))
      const r = await adapter.withTransaction(async () => err(e))
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe(e)
    })

    it('wraps thrown exceptions as ExternalServiceError', async () => {
      const r = await adapter.withTransaction(async () => {
        throw new Error('boom')
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeInstanceOf(ExternalServiceError)
    })
  })
})
