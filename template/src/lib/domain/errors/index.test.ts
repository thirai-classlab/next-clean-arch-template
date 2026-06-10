import { describe, it, expect } from 'vitest'
import * as errors from './index'

describe('errors barrel', () => {
  it('re-exports DomainError', () => {
    expect(typeof errors.DomainError).toBe('function')
  })

  it('re-exports ValidationError', () => {
    expect(typeof errors.ValidationError).toBe('function')
    expect(new errors.ValidationError('x').code).toBe('VALIDATION_ERROR')
  })

  it('re-exports NotFoundError', () => {
    expect(typeof errors.NotFoundError).toBe('function')
    expect(new errors.NotFoundError('Bot', '1').code).toBe('NOT_FOUND')
  })

  it('re-exports AuthorizationError', () => {
    expect(typeof errors.AuthorizationError).toBe('function')
    expect(new errors.AuthorizationError('x').code).toBe('AUTHORIZATION_ERROR')
  })

  it('re-exports ConflictError', () => {
    expect(typeof errors.ConflictError).toBe('function')
    expect(new errors.ConflictError('x').code).toBe('CONFLICT')
  })

  it('re-exports ExternalServiceError', () => {
    expect(typeof errors.ExternalServiceError).toBe('function')
    expect(new errors.ExternalServiceError('s', new Error('x')).code).toBe(
      'EXTERNAL_SERVICE_ERROR',
    )
  })
})
