// src/lib/infrastructure/adapters/mock/mock-internal-rpc.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockInternalRpcAdapter } from './mock-internal-rpc.adapter'
import { ExternalServiceError } from '../../../domain/errors'

describe('MockInternalRpcAdapter', () => {
  let adapter: MockInternalRpcAdapter

  beforeEach(() => {
    adapter = new MockInternalRpcAdapter()
  })

  it('call echoes the payload as the response by default', async () => {
    const r = await adapter.call<{ x: number }, { x: number }>({
      service: 'svc',
      method: 'echo',
      payload: { x: 1 },
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ x: 1 })
  })

  it('call returns ExternalServiceError when force_fail=true', async () => {
    adapter.setForceFail(true)
    const r = await adapter.call({ service: 'svc', method: 'echo', payload: {} })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ExternalServiceError)
  })
})
