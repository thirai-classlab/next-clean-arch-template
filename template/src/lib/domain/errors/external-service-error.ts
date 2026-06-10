// src/lib/domain/errors/external-service-error.ts
import { DomainError } from './domain-error'

export class ExternalServiceError extends DomainError {
  readonly code = 'EXTERNAL_SERVICE_ERROR'

  constructor(service: string, cause: unknown) {
    super(`External service error: ${service}`)
    this.cause = cause
  }
}
