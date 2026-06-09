import { describe, it, expect } from 'vitest'
import { ValidationError } from './validation-error'
import { DomainError } from './domain-error'

describe('ValidationError', () => {
  it('extends DomainError', () => {
    const e = new ValidationError('invalid')
    expect(e).toBeInstanceOf(DomainError)
    expect(e).toBeInstanceOf(ValidationError)
  })

  it('has code = "VALIDATION_ERROR"', () => {
    const e = new ValidationError('invalid')
    expect(e.code).toBe('VALIDATION_ERROR')
  })

  it('has name = "ValidationError"', () => {
    const e = new ValidationError('invalid')
    expect(e.name).toBe('ValidationError')
  })

  it('preserves the message', () => {
    const e = new ValidationError('field x is required')
    expect(e.message).toBe('field x is required')
  })
})
