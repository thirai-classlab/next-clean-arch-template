import { describe, it, expect } from 'vitest'
import { DomainError } from './domain-error'

class TestError extends DomainError {
  readonly code = 'TEST_ERROR'
}

describe('DomainError', () => {
  it('is an abstract base extending Error', () => {
    const e = new TestError('something failed')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(DomainError)
  })

  it('sets name to the concrete class name', () => {
    const e = new TestError('boom')
    expect(e.name).toBe('TestError')
  })

  it('exposes the abstract code field via the concrete subclass', () => {
    const e = new TestError('boom')
    expect(e.code).toBe('TEST_ERROR')
  })

  it('preserves the message passed to the constructor', () => {
    const e = new TestError('a clear message')
    expect(e.message).toBe('a clear message')
  })
})
