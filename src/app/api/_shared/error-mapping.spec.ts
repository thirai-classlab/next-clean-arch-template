// src/app/api/_shared/error-mapping.spec.ts
// Wave 6-K — DomainError.code -> HTTP status mapping unit tests.

import { describe, it, expect } from 'vitest'
import { mapErrorToStatus } from './error-mapping'
import {
  NotFoundError,
  AuthorizationError,
  ConflictError,
  ValidationError,
  ExternalServiceError,
  type DomainError,
} from '@/lib/domain/errors'

describe('mapErrorToStatus', () => {
  it('maps NotFoundError -> 404', () => {
    expect(mapErrorToStatus(new NotFoundError('Bot', 'x'))).toBe(404)
  })

  it('maps AuthorizationError -> 403', () => {
    expect(mapErrorToStatus(new AuthorizationError('denied'))).toBe(403)
  })

  it('maps ConflictError -> 409', () => {
    expect(mapErrorToStatus(new ConflictError('dup'))).toBe(409)
  })

  it('maps ValidationError -> 400', () => {
    expect(mapErrorToStatus(new ValidationError('bad'))).toBe(400)
  })

  it('maps ExternalServiceError -> 502', () => {
    expect(mapErrorToStatus(new ExternalServiceError('svc', null))).toBe(502)
  })

  it('falls back to 500 for unknown code', () => {
    const unknown: DomainError = {
      code: 'WAT',
      name: 'Wat',
      message: 'wat',
    } as never
    expect(mapErrorToStatus(unknown)).toBe(500)
  })
})
