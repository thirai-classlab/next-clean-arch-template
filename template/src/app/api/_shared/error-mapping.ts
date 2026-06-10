// src/app/api/_shared/error-mapping.ts
// Map DomainError.code -> HTTP status (draft 06 §4.1 L964-971).
// Route Handlers are thin wrappers: errors flow as Result.err and are mapped here.

import type { DomainError } from '@/lib/domain/errors'

export function mapErrorToStatus(error: DomainError): number {
  switch (error.code) {
    case 'NOT_FOUND':
      return 404
    case 'AUTHORIZATION_ERROR':
      return 403
    case 'CONFLICT':
      return 409
    case 'VALIDATION_ERROR':
      return 400
    case 'EXTERNAL_SERVICE_ERROR':
      return 502
    default:
      return 500
  }
}
