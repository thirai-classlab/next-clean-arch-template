import { describe, it, expect } from 'vitest'
import { ExternalServiceError } from './external-service-error'
import { DomainError } from './domain-error'

describe('ExternalServiceError', () => {
  it('extends DomainError', () => {
    const e = new ExternalServiceError('recall', new Error('boom'))
    expect(e).toBeInstanceOf(DomainError)
    expect(e).toBeInstanceOf(ExternalServiceError)
  })

  it('has code = "EXTERNAL_SERVICE_ERROR"', () => {
    const e = new ExternalServiceError('recall', new Error('boom'))
    expect(e.code).toBe('EXTERNAL_SERVICE_ERROR')
  })

  it('has name = "ExternalServiceError"', () => {
    const e = new ExternalServiceError('recall', new Error('boom'))
    expect(e.name).toBe('ExternalServiceError')
  })

  it('builds the message from the service name', () => {
    const e = new ExternalServiceError('zoom', new Error('boom'))
    expect(e.message).toBe('External service error: zoom')
  })

  it('exposes the underlying cause', () => {
    const cause = new Error('original failure')
    const e = new ExternalServiceError('recall', cause)
    expect(e.cause).toBe(cause)
  })

  it('accepts a non-Error cause (unknown)', () => {
    const e = new ExternalServiceError('recall', { code: 500 })
    expect(e.cause).toEqual({ code: 500 })
  })
})
