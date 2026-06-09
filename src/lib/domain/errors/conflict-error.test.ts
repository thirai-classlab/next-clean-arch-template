import { describe, it, expect } from 'vitest'
import { ConflictError } from './conflict-error'
import { DomainError } from './domain-error'

describe('ConflictError', () => {
  it('extends DomainError', () => {
    const e = new ConflictError('duplicate')
    expect(e).toBeInstanceOf(DomainError)
    expect(e).toBeInstanceOf(ConflictError)
  })

  it('has code = "CONFLICT"', () => {
    const e = new ConflictError('duplicate')
    expect(e.code).toBe('CONFLICT')
  })

  it('has name = "ConflictError"', () => {
    const e = new ConflictError('duplicate')
    expect(e.name).toBe('ConflictError')
  })

  it('preserves the message', () => {
    const e = new ConflictError('email already in use')
    expect(e.message).toBe('email already in use')
  })
})
