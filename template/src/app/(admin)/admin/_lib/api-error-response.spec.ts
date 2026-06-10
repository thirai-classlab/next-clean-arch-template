// src/app/(admin)/admin/_lib/api-error-response.spec.ts
import { describe, it, expect } from 'vitest'
import {
  buildApiError,
  statusForCode,
  codeForStatus,
  apiErrorFromDomain,
} from './api-error-response'
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('buildApiError', () => {
  it('omits details when undefined', () => {
    expect(buildApiError('UNAUTHORIZED', 'no auth')).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'no auth' },
    })
  })

  it('includes details when provided', () => {
    const details = { fieldErrors: { role: ['required'] } }
    expect(buildApiError('VALIDATION_ERROR', 'bad', details)).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'bad', details },
    })
  })
})

describe('statusForCode', () => {
  it('maps stable codes to HTTP status', () => {
    expect(statusForCode('UNAUTHORIZED')).toBe(401)
    expect(statusForCode('FORBIDDEN')).toBe(403)
    expect(statusForCode('VALIDATION_ERROR')).toBe(400)
    expect(statusForCode('NOT_FOUND')).toBe(404)
    expect(statusForCode('CONFLICT')).toBe(409)
    expect(statusForCode('EXTERNAL_SERVICE_ERROR')).toBe(502)
    expect(statusForCode('INTERNAL_ERROR')).toBe(500)
  })
})

describe('codeForStatus', () => {
  it('reverses the status table', () => {
    expect(codeForStatus(401)).toBe('UNAUTHORIZED')
    expect(codeForStatus(403)).toBe('FORBIDDEN')
    expect(codeForStatus(409)).toBe('CONFLICT')
  })

  it('falls back to INTERNAL_ERROR for unknown status', () => {
    expect(codeForStatus(418)).toBe('INTERNAL_ERROR')
  })
})

describe('apiErrorFromDomain', () => {
  // mapErrorToStatus is reused so the two layers never drift.
  it.each([
    [new ValidationError('bad'), 400, 'VALIDATION_ERROR'],
    [new NotFoundError('user', 'x'), 404, 'NOT_FOUND'],
    [new AuthorizationError('nope'), 403, 'FORBIDDEN'],
    [new ConflictError('dup'), 409, 'CONFLICT'],
    [new ExternalServiceError('boom', null), 502, 'EXTERNAL_SERVICE_ERROR'],
  ])('maps %s -> %i / %s', async (error, status, code) => {
    const res = apiErrorFromDomain(error as never)
    expect(res.status).toBe(status)
    const body = await res.json()
    expect(body.error.code).toBe(code)
    expect(body.error.message).toBe((error as Error).message)
  })
})
