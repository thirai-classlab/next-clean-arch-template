import { describe, it, expect } from 'vitest'
import { AuthorizationError } from './authorization-error'
import { DomainError } from './domain-error'

describe('AuthorizationError', () => {
  it('extends DomainError', () => {
    const e = new AuthorizationError('not allowed')
    expect(e).toBeInstanceOf(DomainError)
    expect(e).toBeInstanceOf(AuthorizationError)
  })

  it('has code = "AUTHORIZATION_ERROR"', () => {
    const e = new AuthorizationError('not allowed')
    expect(e.code).toBe('AUTHORIZATION_ERROR')
  })

  it('has name = "AuthorizationError"', () => {
    const e = new AuthorizationError('nope')
    expect(e.name).toBe('AuthorizationError')
  })

  it('preserves the message', () => {
    const e = new AuthorizationError('admin only')
    expect(e.message).toBe('admin only')
  })
})
