// src/lib/infrastructure/adapters/mock/mock-email.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockEmailAdapter } from './mock-email.adapter'
import { createEmail } from '../../../domain/value-objects/email'
import { ExternalServiceError } from '../../../domain/errors'

describe('MockEmailAdapter', () => {
  let adapter: MockEmailAdapter
  const to = (() => {
    const r = createEmail('a@b.com')
    if (!r.ok) throw new Error('seed failed')
    return r.value
  })()

  beforeEach(() => {
    adapter = new MockEmailAdapter()
  })

  it('send returns a messageId and stores the message', async () => {
    const r = await adapter.send({ to, subject: 'hi', bodyText: 'body' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.messageId).toBeTruthy()
    expect(adapter.sent).toHaveLength(1)
  })

  it('send returns ExternalServiceError when force_fail=true', async () => {
    adapter.setForceFail(true)
    const r = await adapter.send({ to, subject: 'hi', bodyText: 'body' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ExternalServiceError)
  })
})
